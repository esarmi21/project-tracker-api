const express = require('express')
const path = require('path')
const UsersService = require('./users-service')
const usersRouter = express.Router()
const CompanyService = require('../company/company-service')
const jsonBodyParser = express.json()

usersRouter
  .post('/', jsonBodyParser, (req, res, next) => {
    const { password, email, full_name, company_name, isadmin } = req.body

    for (const field of ['full_name', 'email', 'password', 'company_name'])
      if (!req.body[field])
        return res.status(400).json({
          error: `Missing '${field}' in request body`
        })

    if (email.startsWith(' ') || email.endsWith(' ')) {
      return res.status(400).json({
        error: `User name cannot start or end with a space!`
      })
    }

    const passwordError = UsersService.validatePassword(password)

    if (passwordError)
      return res.status(400).json({ error: passwordError })

    UsersService.hasUserWithUserName(
      req.app.get('db'),
      email
    )
    .then(hasUserWithUserName => {
      if (hasUserWithUserName)
        return res.status(400).json({ error: `Username already taken` })

      CompanyService.hasCompanyWithCompanyName(req.app.get('db'), company_name).then(async hasCompanyWithCompanyName => {
        if(!hasCompanyWithCompanyName)
          return res.status(400).json({error: 'Company does not exist'})
        const companyid = await CompanyService.getIdByName(req.app.get('db'), company_name)
        return UsersService.hashPassword(password)
        .then(hashedPassword => {
          const newUser = {
            email,
            password: hashedPassword,
            full_name,
            isadmin: isadmin,
            companyid: companyid
          }

          return UsersService.insertUser(
            req.app.get('db'),
            newUser
          )
            .then(user => {
              res
              .status(201)
              .location(path.posix.join(req.originalUrl, `/${user.id}`))
              .json(UsersService.serializeUser(user))
          })
        })
      })
    })
    .catch(next)
  })

module.exports = usersRouter