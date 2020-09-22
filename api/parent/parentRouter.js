const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const Parents = require('./parentModel');
const jwt = require("jsonwebtoken");
const checkToken = require('../middleware/jwtRestricted');

function createToken(user) {
    const payload = {
        sub: user.id,
        username: user.username
    };
    const secret = process.env.JWTSECRET
    const options = {
      expiresIn: "3h",
    };
        return jwt.sign(payload, secret, options);
}

//login to parent account
//needs a pin and a valid okta ID token
//will return a json web token and child data
router.get('/:id', authRequired, function (req, res){
  //make sure the pin is in the body
  if(req.body.pin){
    //retrieve the parent from the db
    Parents.findById(req.params.id)
      .then((parent)=>{
        //check the pin
        console.log(parent)
        if(parent.pin === req.body.pin){
          //if the pin is correct make a token and get the dashboard data
          const token = createToken(parent);
          Parents.getChildData(req.params.id)
            .then((childData) => {
              if (childData) {
                res.status(200).json({
                  "message": 'logged in',
                  "token": token,
                  "parent": {
                              "id": req.profile.id,
                              "name": req.profile.name,
                              "email": req.profile.email,
                              "admin": req.profile.admin
                            },
                  "childData": childData
                  
                });
              }else{
                res.status(500).json({
                  "message": 'no child data found',
                });
              }
            })
            .catch((err) => {
              res.status(500).json({
                "message": 'error retrieving child data',
                "error": err
              });
            });
        }else{
          res.status(400).json({
            "message": "incorrect pin"
          })
        }
      })
      .catch(err=>{
          res.status(400).json({
            "message": "there is no parent with that ID",
            "error": err
          });
      });
    
    }else{
      res.status(400).json({
        message: 'please include a pin',
      });
    }
});

/* all endpoints after this require a jwt the login above */

//make a child account

router.post('/:id', checkToken, function (req, res) {
  Parents.findById(req.params.id)
    .then((parent) => {
      if (parent) {
        const newchildObj = {
          ...req.body,
          parent_id: req.params.id,
        };
        Parents.createChild(newchildObj)
          .then((response) => {
            console.log(response)
            if (response) {
              res.status(200).json({
                message: 'created a new child',
                ...response,
              });
            } else {
              res.status(500).json({
                message: 'unable to retrieve new child data',
              });
            }
          })
          .catch((err) => {
            res.status(500).json({
              message: 'error adding child to database',
              error: err,
            });
          });
      } else {
        res.status(400).json({
          message: 'there is no parent with that id',
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        message: 'unable to retrieve parent data',
        error: err,
      });
    });
});


//put for parent

//delete for parent

//delete for child account


module.exports = router;