var falcor = require('./../../lib/');
var Model = falcor.Model;
var Cache = require('../data/Cache');
var Expected = require('../data/expected');
var LocalDataSource = require('../data/LocalDataSource');
var Rx = require('rx');
var getTestRunner = require('./../getTestRunner');
var testRunner = require('./../testRunner');
var model = testRunner.getModel(null, Cache());
var References = Expected.References;
var Complex = Expected.Complex;
var Values = Expected.Values;
var Bound = Expected.Bound;
var Materialized = Expected.Materialized;
var Boxed = Expected.Boxed;
var Errors = Expected.Errors;
var $atom = require('./../../lib/types/atom');
var $error = require('./../../lib/types/error');
var noOp = function() {};
var sinon = require('sinon');

describe('Specific Cases', function() {
    describe('Seed Filling', function() {
        it('should continue to populate the seed toJSON()', function () {
            var model = new Model({cache: Cache()}).withoutDataSource();
            var seed = [{}];
            model._getPathValuesAsPathMap(model, [['videos', 0, 'summary']], seed);
            model._getPathValuesAsPathMap(model, [['videos', 1, 'summary']], seed);

            testRunner.compare({
                'title': 'Additional Title 0',
                'url': '/movies/0'
            }, seed[0].json.videos[0].summary);

            testRunner.compare({
                'title': 'Additional Title 1',
                'url': '/movies/1'
            }, seed[0].json.videos[1].summary);
        });
        it('should continue to populate the seed _toJSONG()', function () {
            var model = new Model({cache: Cache()}).withoutDataSource();
            var seed = [{}];
            model._getPathValuesAsJSONG(model, [['videos', 0, 'summary']], seed);
            model._getPathValuesAsJSONG(model, [['videos', 1, 'summary']], seed);

            testRunner.compare({
                $type: $atom,
                $size: 51,
                value: {
                    'title': 'Additional Title 0',
                    'url': '/movies/0'
                }
            }, seed[0].jsonGraph.videos[0].summary);

            testRunner.compare({
                $type: $atom,
                $size: 51,
                value: {
                    'title': 'Additional Title 1',
                    'url': '/movies/1'
                }
            }, seed[0].jsonGraph.videos[1].summary);
        });
        it('should fill double permute complex paths with partially filled seed.', function () {
            var model = new Model({cache: Cache()}).withoutDataSource();
            var seed = [{
                json: {
                    0: {
                        0: {
                            'title': 'House of Cards',
                            'url': '/movies/1234'
                        }
                    }
                }
            }];
            model._getPathValuesAsJSON(model, [
                ['genreList', [0], [1], 'summary']
            ], seed);

            testRunner.compare({
                'title': 'House of Cards',
                'url': '/movies/1234'
            }, seed[0].json[0][0]);
            testRunner.compare({
                'title': 'Terminator 3',
                'url': '/movies/766'
            }, seed[0].json[0][1]);
        });
    });

    describe('Materialized', function() {
        it('should not report an atom with undefined in non-materialize mode.', function(done) {
            var model = new Model({cache: Cache(), source: {}});
            var called = false;
            model.
                get('misc.uatom').
                toPathValues().
                doAction(function(res) {
                    called = true;
                },
                noOp,
                function() {
                    testRunner.compare(false, called);
                }).
                subscribe(noOp, done, done);
        });
        it('should report an atom with undefined in non-materialize mode but with box mode.', function(done) {
            var model = new Model({cache: Cache(), source: {}}).boxValues();
            var called = false;
            model.
                get('misc.uatom').
                toPathValues().
                doAction(function(res) {
                    called = true;
                    testRunner.compare({
                        path: ['misc', 'uatom'],
                        value: {
                            $type: $atom,
                            $size: 51,
                            value: undefined
                        }
                    }, res);
                },
                noOp,
                function() {
                    testRunner.compare(true, called);
                }).
                subscribe(noOp, done, done);
        });
        it('should ensure that falsey values do not get removed.', function(done) {
            var model = new Model({cache: {
                misc: {
                    atomU: Model.atom(undefined),
                    atom0: Model.atom(0),
                    atomFalse: Model.atom(false),
                    atomEmpty: Model.atom('')
                }
            }});
            var called = 0;
            var expected = [{
                path: ['misc', 'atom0'],
                value: 0
            }, {
                path: ['misc', 'atomFalse'],
                value: false
            }, {
                path: ['misc', 'atomEmpty'],
                value: ''
            }];
            model.
                // since we are using cache, order is guarenteed
                get(['misc', ['atomU', 'atom0', 'atomFalse', 'atomEmpty']]).
                toPathValues().
                doAction(function(res) {
                    testRunner.compare(expected[called], res);
                    ++called;
                },
                noOp,
                function() {
                    testRunner.compare(3, called);
                }).
                subscribe(noOp, done, done);
        });
        it('should ensure that falsey values do not get removed in materialize.', function(done) {
            var model = new Model({cache: {
                misc: {
                    atomU: Model.atom(undefined),
                    atom0: Model.atom(0),
                    atomFalse: Model.atom(false),
                    atomEmpty: Model.atom('')
                }
            }})._materialize();
            var called = 0;
            var expected = [{
                path: ['misc', 'atomU'],
                value: {$type: $atom}
            }, {
                path: ['misc', 'atom0'],
                value: 0
            }, {
                path: ['misc', 'atomFalse'],
                value: false
            }, {
                path: ['misc', 'atomEmpty'],
                value: ''
            }];
            model.
                // since we are using cache, order is guarenteed
                get(['misc', ['atomU', 'atom0', 'atomFalse', 'atomEmpty']]).
                toPathValues().
                doAction(function(res) {
                    testRunner.compare(expected[called], res);
                    ++called;
                },
                noOp,
                function() {
                    testRunner.compare(4, called);
                }).
                subscribe(noOp, done, done);
        });
    });

});
