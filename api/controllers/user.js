'use strict';

const crypto = require('crypto');
const aws = require('aws-sdk');
aws.config.loadFromPath('./config/aws_config.json');
const pool = require('../../config/db_pool');


function getUserProfileById(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).send({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var user_id = req.swagger.params.user_id.value;
            var query1 = "SELECT username FROM User WHERE id=?";
            connection.query(query1, [user_id], function(err1, data1){
                if(err1){
                    console.log('selectQueryError:', err1);
                    res.status(500).send({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    var query2 = "SELECT team_id FROM MyTeam WHERE user_id=?";
                    connection.query(query2, [user_id], function(err2, data2){
                       if(err2){
                           console.log('selectQueryError:', err2);
                           res.status(500).send({
                               'message': 'Select Query to DB Failed'
                           });
                       }
                       else{
                           var query3 = "SELECT team_id FROM MyTeamLog WHERE user_id=? and result='Wait'";
                           connection.query(query3, [user_id], function(err3, data3){
                              if(err3){
                                  console.log('selectQueryError:', err3);
                                  res.status(500).send({
                                      'message': 'Select Query to DB Failed'
                                  });
                              }
                              else{
                                  var myteam_list = [], waitteam_list = [];
                                  for(var x=0; x<data2.length; x++) myteam_list.push(data2[x].team_id);
                                  for(var x=0; x<data3.length; x++) waitteam_list.push(data3[x].team_id);
                                  console.log('Get user profile success:', user_id);
                                  res.status(200).json({
                                      'username': data1[0].username,
                                      'myteam_list': myteam_list,
                                      'waitteam_list': waitteam_list
                                  });
                              }
                           });
                       }
                    });
                }
                connection.release();
            });
        }
    });
}

module.exports = {
    getUserProfileById: getUserProfileById
}