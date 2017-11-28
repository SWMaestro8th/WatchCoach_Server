'use strict';

const crypto = require('crypto');
const aws = require('aws-sdk');
aws.config.loadFromPath('./config/aws_config.json');
const pool = require('../../config/db_pool');


function signup(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).send({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var username = req.swagger.params.userdata.value.username;
            var password = req.swagger.params.userdata.value.password;

            /* Hash the password */
            var cipher = crypto.createCipher('aes192', 'mypassword');
            var password_hash = cipher.update(password, 'utf8', 'base64');
            password_hash += cipher.final('base64');

            var query = "INSERT INTO User (username, password) VALUES(?, ?)";
            connection.query(query, [username, password_hash], function(err, data){
               if(err){
                   console.log('insertQueryError:', err);
                   res.status(500).send({
                       'message': 'Insert Query to DB Failed'
                   });
               }
               else{
                   console.log('Create New User:', username);
                   res.status(200).json({
                       'user_id': data.insertId
                   });
               }
               connection.release();
            });
        }
    });
}

function login(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).send({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var username = req.swagger.params.userdata.value.username;
            var password = req.swagger.params.userdata.value.password;
            /* Hash the password */
            console.log(typeof(username));
            console.log(username);
            var cipher = crypto.createCipher('aes192', 'mypassword');
            var password_hash = cipher.update(password, 'utf8', 'base64');
            password_hash += cipher.final('base64');
            console.log(password_hash);
            console.log(typeof(password_hash));

            var query = "SELECT id FROM User WHERE username=? AND password=?";
            connection.query(query, [username, password_hash], function(err, data){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).send({
                        'message': 'Select Query from DB Failed'
                    });
                }
                else{
                    console.log('username:', username);
                    console.log('password:', password);
                    if(data.length==0){
                        console.log('notExistAccount, loginFailed');
                        res.status(201).json({
                            'message': 'Unregistered username or wrong password'
                        });
                    }
                    else if(data.length==1){
                        console.log('loginSuccess');
                        res.status(200).json({
                            'user_id': data[0].id
                        });
                    }
                    else{
                        console.log('twoOrMoreAccount, loginFailed');
                        res.status(500).json({
                            'message': '[Critical] System Crushed'
                        });
                    }
                }
                connection.release();
            });
        }
    });
}

function usernameDupCheck(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).send({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var username = req.swagger.params.username.value;
            console.log(username);
            var query = "SELECT * FROM User WHERE username=?"
            connection.query(query, [username], function(err, data){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).send({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    console.log(data);
                    if(data.length==0){
                        console.log("Can use the username:", username)
                        res.status(200).json({
                            'message': 'Can use the username'
                        });
                    }
                    else{
                        console.log("Cannot use the username:", username)
                        res.status(201).json({
                            'message': 'Already used username'
                        });
                    }
                }
                connection.release();
            });
        }
    });
}

module.exports = {
    signup: signup,
    login: login,
    usernameDupCheck: usernameDupCheck
}