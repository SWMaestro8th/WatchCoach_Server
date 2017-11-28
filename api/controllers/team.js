'use strict';

const crypto = require('crypto');
const aws = require('aws-sdk');
const moment = require('moment');
aws.config.loadFromPath('./config/aws_config.json');
const pool = require('../../config/db_pool');


function getTeamList(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var query = "SELECT * FROM Team";
            connection.query(query, function(err, data) {
                if (err) {
                    console.log('selectQueryError:', err);
                    res.status(500).json({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    for(var i=0; i<data.length; i++){
                        data[i].option_auto_join = data[i].option_auto_join==0?false:true;
                        data[i].option_re_request_join = data[i].option_re_request_join==0?false:true;
                    }
                    res.status(200).json({
                        'team_list': data
                    });
                }
                connection.release();
            });
        }
    });
}

function teamnameDupCheck(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var teamname = req.swagger.params.teamname.value;
            console.log('teamname: ', teamname);
            var query = "SELECT 1 FROM Team WHERE teamname=?";
            connection.query(query, [teamname], function(err, data1){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).json({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    if(data1.length==0){
                        console.log('usable teamname: ', teamname);
                        res.status(200).json({
                            'message': 'Usable teamname'
                        });
                    }
                    else{
                        console.log('already used teamname: ', teamname);
                        res.status(201).json({
                            'message': 'Duplicate teamname'
                        });
                    }
                }
                connection.release();
            });
        }
    });
}

function foundNewTeam(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var teamdata = req.swagger.params.teamdata.value;

            var query = "INSERT INTO Team (teamname, sector, owner_id, message, found_dt, option_auto_join, option_re_request_join)" +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)";
            connection.query(query, [teamdata.teamname, teamdata.sector, teamdata.owner_id, teamdata.message, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'), teamdata.option_auto_join, teamdata.option_re_request_join], function(err, data){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).json({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    console.log("Team creation success");
                    res.status(200).json({
                        'team_id': data.insertId
                    });
                }
                connection.release();
            });
        }
    });
}

function getTeamMemberById(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var team_id = req.swagger.params.team_id.value;

            var query = "SELECT U.id, U.username FROM User U, MyTeam MT WHERE MT.team_id=? and MT.user_id=U.id";
            connection.query(query, [team_id], function(err, data){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).json({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    console.log('Get team members success:', team_id);
                    res.status(200).json({'user_list': data});
                }
                connection.release();
            });
        }
    });
}

function getTeamWaitingById(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var team_id = req.swagger.params.team_id.value;

            var query = "SELECT user_id FROM MyTeamLog WHERE team_id=? and result='Waiting'";
            connection.query(query, [team_id], function(err, data){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).json({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    var user_list = [];
                    for(var x=0; x<data.length; x++) user_list.push(data[x].user_id);
                    console.log('Get team waitings success:', team_id);
                    res.status(200).json({'user_list': user_list});
                }
                connection.release();
            });
        }
    });
}

function requestTeamJoin(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
             var team_id = req.swagger.params.team_id.value;
             var user_id = req.swagger.params.user_id.value;

             var query1 = "Select result FROM MyTeamLog WHERE user_id=? and team_id=? order by submit_dt desc limit 1";
             connection.query(query1, [user_id, team_id], function(err1, data1){
                 if(err1){
                     console.log('selectQueryError:', err1);
                     res.status(500).json({
                         'message': 'Select Query to DB Failed'
                     });
                 }
                 else{
                     if(data1.length==0 || data1[0].result=='Exited'){
                         var query2 = "Select option_auto_join FROM Team WHERE id=?";
                         connection.query(query2, [team_id], function(err2, data2) {
                             if (err2) {
                                 console.log('selectQueryError:', err2);
                                 res.status(500).json({
                                     'message': 'Select Query to DB Failed'
                                 });
                             }
                             else{
                                 if(data2[0].option_auto_join==true){
                                     var query3 = "Insert into MyTeamLog (user_id, team_id, submit_dt, result) values (?, ?, ?, ?)";
                                     connection.query(query3, [user_id, team_id, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss') , 'Accept'], function(err3){
                                         if(err3){
                                             console.log('insertQueryError:', err3);
                                             res.status(500).json({
                                                 'message': 'Insert Query to DB Failed'
                                             });
                                         }
                                         else{
                                             var query4 = "Insert into MyTeam (user_id, team_id) values (?, ?)";
                                             connection.query(query4, [user_id, team_id], function(err4){
                                                if(err4){
                                                    console.log('insertQueryError:', err4);
                                                    res.status(500).json({
                                                        'message': 'Insert Query to DB Failed'
                                                    });
                                                }
                                                else{
                                                    console.log('User join team success');
                                                    res.status(200).json({
                                                        'message': 'user_id:{} join the team_id:{} success'.format(user_id, team_id)
                                                    });
                                                }
                                             });
                                         }
                                     });
                                 }
                                 else{
                                     var query3 = "Insert into MyTeamLog (user_id, team_id, submit_dt, result) values (?, ?, ?, ?)";
                                     connection.query(query3, [user_id, team_id, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss') , 'Waiting'], function(err3) {
                                         if (err3) {
                                             console.log('insertQueryError:', err3);
                                             res.status(500).json({
                                                 'message': 'Insert Query to DB Failed'
                                             });
                                         }
                                         else {
                                             console.log('request user to join the team success');
                                             res.status(200).json({
                                                 'message': 'request user_id:'+user_id+' to join the team_id:'+team_id+' success'
                                             });
                                         }
                                     });
                                 }
                             }
                         });
                     }
                     else if(data1[0].result=='Waiting') {
                         console.log('Duplicate request from user_id:'+user_id+' to join team_id:'+team_id);
                         res.status(400).json({
                             'message': 'Duplicate request for the team'
                         });
                     }
                     else if(data1[0].result=='Accept'){
                         console.log('Already joined user request to join from user_id:'+user_id+' to team_id:'+team_id);
                         res.status(401).json({
                             'message': 'Already joined to the team'
                         });
                     }
                     else{
                         var query2 = "Select option_re_request_join, option_auto_join FROM Team WHERE id=?";
                         connection.query(query2, [team_id], function(err2, data2){
                            if(err2){
                                console.log('selectQueryError:', err2);
                                res.status(500).json({
                                    'message': 'Select Query to DB Failed'
                                });
                            }
                            else{
                                if(data2[0].option_re_requiest_join == true){
                                    if(data2[0].option_auto_join==true){
                                        var query3 = "Insert into MyTeamLog (user_id, team_id, submit_dt, result) values (?, ?, ?, ?)";
                                        connection.query(query3, [user_id, team_id, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss') , 'Accept'], function(err3){
                                            if(err3){
                                                console.log('insertQueryError:', err3);
                                                res.status(500).json({
                                                    'message': 'Insert Query to DB Failed'
                                                });
                                            }
                                            else{
                                                var query4 = "Insert into MyTeam (user_id, team_id) values (?, ?)";
                                                connection.query(query4, [user_id, team_id], function(err4){
                                                    if(err4){
                                                        console.log('insertQueryError:', err4);
                                                        res.status(500).json({
                                                            'message': 'Insert Query to DB Failed'
                                                        });
                                                    }
                                                    else{
                                                        console.log('User join team success');
                                                        res.status(200).json({
                                                            'message': 'user_id:{} join the team_id:{} success'.format(user_id, team_id)
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    else{
                                        var query3 = "Insert into MyTeamLog (user_id, team_id, submit_dt, result) values (?, ?, ?, ?)";
                                        connection.query(query3, [user_id, team_id, moment(Date.now()).format('YYYY-MM-DD HH:mm:ss') , 'Waiting'], function(err3) {
                                            if (err3) {
                                                console.log('insertQueryError:', err3);
                                                res.status(500).json({
                                                    'message': 'Insert Query to DB Failed'
                                                });
                                            }
                                            else {
                                                console.log('request user to join the team success');
                                                res.status(200).json({
                                                    'message': 'request user_id:{} to join the team_id:{} success'.format(user_id, team_id)
                                                });
                                            }
                                        });
                                    }
                                }
                                else{
                                    console.log('Duplicate request from user_id:{} to team_id:{}'.format(user_id, team_id));
                                    res.status(402).json({
                                        'message': 'Does not allowed to request join'
                                    });
                                }
                            }
                         });
                     }
                 }
                 connection.release();
             });
        }
    });
}

function manageTeamWaitingById(req, res) {
    pool.getConnection(function(error, connection) {
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var team_id = req.swagger.params.team_id.value;
            var target_user_id = req.swagger.params.commitdata.value.target_user_id;
            var accept_or_reject = req.swagger.params.commitdata.value.accept_or_reject;

            var query1 = "UPDATE MyTeamLog SET result=? WHERE user_id=? and team_id=? and result='Waiting' ORDER BY submit_dt DESC LIMIT 1";
            connection.query(query1, [accept_or_reject, target_user_id, team_id], function(err1, data1){
                if(err1){
                    console.log('updateQueryError:', err1);
                    res.status(500).json({
                        'message': 'Update Query to DB Failed'
                    });
                }
                else{
                    if(data1.affectedRows==0){
                        console.log('Invalid Management');
                        res.status(400).json({
                            'message': 'Invalid management for user_id:'+target_user_id+' to join team_id:'+team_id
                        });
                    }
                    else{
                        if(accept_or_reject == 'Accept'){
                            var query2 = "Insert INTO MyTeam (user_id, team_id) values (?, ?)";
                            connection.query(query2, [target_user_id, team_id], function(err2){
                               if(err2){
                                   consoe.log('insertQueryError:', err2);
                                   res.status(500).json({
                                       'message': 'Insert Query to DB Failed'
                                   });
                               }
                               else{
                                   console.log('management success');
                                   res.status(200).json({
                                       'message': 'Management Success'
                                   });
                               }
                            });
                        }
                        else{
                            console.log('management success');
                            res.status(200).json({
                                'message': 'Management Success'
                            });
                        }
                    }
                }
                connection.release();
            });
        }
    });
}


function getRecordedGameListById(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).json({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var team_id = req.swagger.params.team_id.value;

            var query = "SELECT * FROM Game WHERE hometeam_id=?";
            connection.query(query, [team_id], function(err, data){
                if(err){
                    console.log('selectQueryError:', err);
                    res.status(500).json({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    console.log('Get recorded game overview success:', team_id);
                    res.status(200).json({'game_list': data});
                }
                connection.release();
            });
        }
    });
}

module.exports = {
    getTeamList: getTeamList,
    getTeamMemberById: getTeamMemberById,
    getTeamWaitingById: getTeamWaitingById,
    foundNewTeam: foundNewTeam,
    teamnameDupCheck: teamnameDupCheck,
    requestTeamJoin: requestTeamJoin,
    manageTeamWaitingById: manageTeamWaitingById,
    getRecordedGameListById: getRecordedGameListById
}