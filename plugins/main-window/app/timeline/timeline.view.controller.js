'use strict';
var ipc = require("electron").ipcRenderer

angular.module('angularDemoApp')
    .controller('TimelineViewController', function ($window, $rootScope, $mdDialog, $scope, $filter, TrackItemService, settingsData, $sessionStorage) {
        var ctrl = this;

        ctrl.trackItems = [];
        ctrl.selectedTrackItem = null;
        ctrl.pieData = [];
        ctrl.dayStats = {};

        var w = $window.innerWidth;
        var pieWidth = w / 3 - 16 * 3;

        ctrl.pieOptions = {
            chart: {
                type: 'pieChart',
                height: pieWidth,
                width: pieWidth,
                x: function (d) {
                    if (d.app === 'Default') {
                        return d.title
                    }
                    return (d.app) ? d.app : 'undefined';
                },
                y: function (d) {
                    return d.timeDiffInMs;
                },
                color: function (d) {
                    return d.color;
                },
                valueFormat: function (d) {
                    return $filter('msToDuration')(d);
                },
                showLabels: false,
                duration: 500,
                labelThreshold: 0.01,
                labelSunbeamLayout: true,
                showLegend: false,
                donut: true,
                donutRatio: 0.30

            }
        };

        //ctrl.maxDate = new Date();

        function getTomorrow(d) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
        }

        var today = new Date();
        var tomorrow = getTomorrow(today);
        ctrl.searchDate = today;

        today.setHours(0, 0, 0, 0);
        console.log(today, tomorrow);

        ctrl.dayBack = function () {
            ctrl.searchDate = moment(ctrl.searchDate).subtract(1, 'days').toDate();
            ctrl.list();

        };
        ctrl.dayForward = function () {
            ctrl.searchDate = moment(ctrl.searchDate).add(1, 'days').toDate();
            ctrl.list();
        };

        ctrl.loading = false;
        ctrl.list = function () {
            console.log("Refresh data");
            ctrl.zoomScale = $sessionStorage.zoomScale || 0;
            ctrl.zoomX = $sessionStorage.zoomX || 0;
            ctrl.loading = true;
            TrackItemService.findAll({

                orderBy: [
                    ['beginDate', 'ASC']
                ], where: {
                    beginDate: {
                        '>=': ctrl.searchDate,
                        '<': getTomorrow(ctrl.searchDate)
                    }
                }
            }).then(function (items) {
                ctrl.trackItems = items;
                ctrl.loading = false;


                function sumApp(p, c) {
                    return _.extend(p, {
                        timeDiffInMs: p.timeDiffInMs + moment(c.endDate).diff(c.beginDate)
                    });
                };

                ctrl.pieDataApp = _.chain(items).filter(function (item) {
                    return item.taskName === 'AppTrackItem';
                })
                    .groupBy('app')
                    .map(function (b) {
                        return b.reduce(sumApp, {app: b[0].app, timeDiffInMs: 0, color: b[0].color})
                    })
                    .valueOf();

                ctrl.pieDataLog = _.chain(items).filter(function (item) {
                    return item.taskName === 'LogTrackItem';
                })
                    .groupBy('title')
                    .map(function (b) {
                        return b.reduce(sumApp, {app: b[0].app, title: b[0].title, timeDiffInMs: 0, color: b[0].color})
                    })
                    .valueOf();

                ctrl.pieDataStatus = _.chain(items).filter(function (item) {
                    return item.taskName === 'StatusTrackItem';
                })
                    .groupBy('app')
                    .map(function (b) {
                        return b.reduce(sumApp, {app: b[0].app, timeDiffInMs: 0, color: b[0].color})
                    })
                    .valueOf();

                setWorkStatsForDay(items.filter(function (item) {
                    return item.taskName === 'AppTrackItem';
                }));
                $rootScope.$apply();
            });
        };

        function setWorkStatsForDay(items) {
            var firstItem = _.first(items);
            if (firstItem && settingsData.workDayStartTime) {

                var parts = settingsData.workDayStartTime.split(':')
                var startDate = moment(firstItem.beginDate);
                startDate.startOf('day');
                startDate.hour(parts[0]);
                startDate.minute(parts[1]);
                ctrl.dayStats.lateForWork = moment(firstItem.beginDate).diff(startDate)
            }

        }

        $scope.$watch('timelineCtrl.selectedTrackItem', function (newValue, oldValue) {
            if (newValue) {
                console.log('Track Item selected', newValue);
                // var el = angular.element( document.querySelector( '#trackItemMiniEdit'));
                // console.log(el)

            }
        }, true);

        ctrl.onZoomChanged = function (scale, x) {
            $sessionStorage.zoomScale = scale;
            $sessionStorage.zoomX = x;
        };

        ipc.on('main-window-focus', function (event, arg) {
            console.log("Main-Window gained focus, reloading");
            ctrl.list();
        });

        ctrl.showAddLogDialog = function (trackItem) {
            console.log(trackItem)
            $mdDialog.show({
                templateUrl: 'app/trackItem/trackItem.edit.modal.html',
                controller: 'TrackItemEditModalController as trackItemModalCtrl',
                parent: angular.element(document.body),
                locals: {
                    trackItem: trackItem
                },
                clickOutsideToClose: true
            }).then(function (trackItem) {
                console.log('TrackItem added.');
                ctrl.saveTrackItem(trackItem)
            });
        };

        ctrl.saveTrackItem = function (trackItem) {
            console.log("Saving trackitem.", trackItem);
            if (!trackItem.taskName) {
                trackItem.taskName = "LogTrackItem";
            }
            if (trackItem.id) {
                TrackItemService.update(trackItem.id, trackItem).then(function (item) {
                    console.log("Updated trackitem to DB:", item);
                    ctrl.selectedTrackItem = null;
                    ctrl.list();
                });
            } else {
                if (!trackItem.app) {
                    trackItem.app = "Default";
                }
                TrackItemService.create(trackItem).then(function (item) {
                    console.log("Created trackitem to DB:", item);
                    ctrl.selectedTrackItem = null;
                    ctrl.list();
                });
            }

        };

        ctrl.deleteTrackItem = function (trackItem) {
            console.log("Deleting trackitem.", trackItem);

            if (trackItem.id) {
                TrackItemService.destroy(trackItem.id).then(function (item) {
                    console.log("Deleting trackitem from DB:", item);
                    ctrl.selectedTrackItem = null;
                    ctrl.list();
                });
            } else {
                console.log("No id, not deleting from DB");
            }

        };

        ctrl.closeMiniEdit = function () {
            console.log("Closing mini edit.");
            ctrl.selectedTrackItem = null;
        };

        ctrl.list();

    });
