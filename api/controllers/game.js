'use strict';

const crypto = require('crypto');
const aws = require('aws-sdk');
aws.config.loadFromPath('./config/aws_config.json');
const pool = require('../../config/db_pool');


function getRecordedGameById(req, res){
    pool.getConnection(function(error, connection){
        if(error){
            console.log('getConnectionError:', error);
            res.status(500).send({
                'message': 'Get DB Connection Failed'
            });
        }
        else{
            var game_id = req.swagger.params.game_id.value;
            var query1 = "SELECT * FROM Position WHERE game_id=? order by datetime";
            connection.query(query1, [game_id], function(err1, data1){
                if(err1){
                    console.log('selectQueryError:', err1);
                    res.status(500).send({
                        'message': 'Select Query to DB Failed'
                    });
                }
                else{
                    var query2 = "SELECT * FROM Shoot WHERE game_id=? order by datetime";
                    connection.query(query2, [game_id], function(err2, data2){
                        if(err2){
                            console.log('selectQueryError:', err2);
                            res.status(500).send({
                                'message': 'Select Query to DB Failed'
                            });
                        }
                        else {
                            var position_data = [];
                            for (var x = 0; x < data1.length; x++) {
                                var positions = [];
                                positions.append({
                                    'px': data1[x].p0x,
                                    'py': data1[x].p0y,
                                    'team': 2
                                });
                                for (var y = 1; y <= 10; y++) {
                                    positions.append({
                                        'px': data1[x]['p' + str(y) + 'x'],
                                        'py': data1[x]['p' + str(y) + 'y'],
                                        'team': (x <= 5) ? 0 : 1
                                    });
                                }
                                position_data.append({
                                    'datetime': data1[x].datetime,
                                    'positions': positions,
                                    'own_team': data1[x].own_team
                                });
                            }
                            var query3 = "SELECT px, py, is_goal, team, datetime FROM Shoot WHERE game_id=?";
                            connection.query(query3, [game_id], function(err3, data3){
                                if(err3){
                                    console.log('selectQueryError:', err2);
                                    res.status(500).send({
                                        'message': 'Select Query to DB Failed'
                                    });
                                }
                                else{
                                    var shoot_data =[];
                                    for(var x=0; x<data3.length; x++){
                                        var position = {'px': data3[x].px, 'py': data3[x].py, 'team': data3[x].team};
                                        shoot_data.append({
                                            'datetime': data3[x].datetime,
                                            'position': position,
                                            'is_goal': data3[x].is_goal
                                        });
                                    }
                                    res.status(200).json({
                                        'position_data': position_data,
                                        'shoot_data': shoot_data
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
    getRecordedGameById: getRecordedGameById
}