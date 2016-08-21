var getCoreRunner = require('./../getCoreRunner');
var cacheGenerator = require('./../CacheGenerator');
var outputGenerator = require('./../outputGenerator');
var jsonGraph = require('falcor-json-graph');
var atom = jsonGraph.atom;
var ref = jsonGraph.ref;
var _ = require('lodash');
var expect = require('chai').expect;
var InvalidKeySetError = require('./../../lib/errors/InvalidKeySetError');

describe('Values', function() {
    // PathMap ----------------------------------------
    it('should get a simple value out of the cache', function() {
        getCoreRunner({
            input: [['videos', 0, 'title']],
            output: outputGenerator.videoGenerator([0]),
            cache: cacheGenerator(0, 1)
        });
    });
    it('should get a value through a reference.', function() {
        getCoreRunner({
            input: [['lolomo', 0, 0, 'item', 'title']],
            output: outputGenerator.lolomoGenerator([0], [0]),
            cache: cacheGenerator(0, 1)
        });
    });
    it('should get a value of type atom when in materialized mode.', function() {
        getCoreRunner({
            input: [['videos', {to:1}, 'title']],
            materialize: true,
            output: {
                json: {
                    videos: {
                        $__path: ['videos'],
                        0: {
                            $__path: ['videos', 0],
                            title: {$type: 'atom'}
                        },
                        1: {
                            $__path: ['videos', 1],
                            title: {$type: 'atom'}
                        }
                    }
                }
            },
            cache: {
                jsonGraph: {
                    videos: {
                        0: {
                            title: {$type: 'atom'}
                        },
                        1: {
                            title: {$type: 'atom'}
                        }
                    }
                },
                paths: [
                    ['videos', {to: 1}, 'title']
                ]
            }
        });
    });
    it('should get a value through references with complex pathSet.', function() {
        getCoreRunner({
            input: [['lolomo', {to: 1}, {length: 2}, 'item', 'title']],
            output: outputGenerator.lolomoGenerator([0, 1], [0, 1]),
            cache: cacheGenerator(0, 30)
        });
    });
    it('should throw if a KeySet includes another KeySet.', function() {
        var error;
        try {
            getCoreRunner({
                input: [['lolomo', [[{ to: 1}]], {length: 2}, 'item', 'title']],
                output: outputGenerator.lolomoGenerator([0, 1], [0, 1]),
                cache: cacheGenerator(0, 30)
            });
        } catch (e) {
            error = e;
        } finally {
            expect(error instanceof InvalidKeySetError).to.be.ok;
        }
    });
    it('should allow for multiple arguments with different length paths.', function() {
        var lolomo0 = {
            length: 1337
        };
        lolomo0.$__path = ['lolomo', '0'];
        var lolomo = {
            length: 1,
            0: lolomo0
        };
        lolomo.$__path = ['lolomo'];
        var output = {
            json: {
                lolomo: lolomo
            }
        };

        getCoreRunner({
            input: [
                ['lolomo', 0, 'length'],
                ['lolomo', 'length']
            ],
            output: output,
            cache: {
                lolomo: {
                    length: 1,
                    0: {
                        length: 1337
                    }
                }
            }
        });
    });
    it('should allow for a null at the end to get a value behind a reference.', function() {
        getCoreRunner({
            input: [['lolomo', null]],
            output: {
                json: {
                    lolomo: 'value'
                }
            },
            cache: {
                lolomo: jsonGraph.ref(['test', 'value']),
                test: {
                    value: atom('value')
                }
            }
        });
    });
    it('should not get the value after the reference.', function() {
        getCoreRunner({
            input: [['lolomo']],
            output: {
                json: {
                    lolomo: ['test', 'value']
                }
            },
            cache: {
                lolomo: jsonGraph.ref(['test', 'value']),
                test: {
                    value: atom('value')
                }
            }
        });
    });
    it('should have no output for empty paths.', function() {
        getCoreRunner({
            input: [['lolomo', 0, [], 'item', 'title']],
            output: {},
            cache: cacheGenerator(0, 1)
        });
    });
    it('should use the branchSelector to build JSON branches if provided', function() {
        getCoreRunner({
            input: [['videos', [0, 1], 'title']],
            cache: cacheGenerator(0, 2),

            // branchSelector = (
            //     nodeKey: String|Number|null,
            //     nodePath: Array|null,
            //     nodeVersion: Number,
            //     requestedPath: Array,
            //     requestedDepth: Number,
            //     referencePath: Array|null,
            //     pathToReference: Array|null
            // ) => Object { $__path?, $__refPath?, $__toReference? }

            branchSelector: function(key, path, version,
                                     requestedPath, requestedDepth,
                                     referencePath, pathToReference) {
                var json = { $__userGenerated: true };
                if (path) {
                    json.$__path = path;
                }
                if (referencePath && pathToReference) {
                    json.$__refPath = referencePath;
                    json.$__toReference = pathToReference;
                }
                return json;
            },
            output: {
                json: {
                    $__userGenerated: true,
                    videos: {
                        $__path: ['videos'],
                        $__userGenerated: true,
                        0: {
                            $__path: ['videos', 0],
                            $__userGenerated: true,
                            title: 'Video 0'
                        },
                        1: {
                            $__path: ['videos', 1],
                            $__userGenerated: true,
                            title: 'Video 1'
                        }
                    }
                }
            }
        });
    });

    // JSONGraph ----------------------------------------
    it('should get JSONGraph for a single value out, modelCreated', function() {
        getCoreRunner({
            input: [['videos', 0, 'title']],
            isJSONG: true,
            output: {
                jsonGraph: {
                    videos: {
                        0: {
                            title: 'Video 0'
                        }
                    }
                },
                paths: [['videos', 0, 'title']]
            },
            cache: cacheGenerator(0, 1, undefined, true)
        });
    });
    it('should get JSONGraph for a single value out, !modelCreated', function() {
        getCoreRunner({
            input: [['videos', 0, 'title']],
            isJSONG: true,
            output: {
                jsonGraph: {
                    videos: {
                        0: {
                            title: atom('Video 0')
                        }
                    }
                },
                paths: [['videos', 0, 'title']]
            },
            cache: cacheGenerator(0, 1, undefined, false)
        });
    });
    it('should allow for multiple arguments with different length paths as JSONGraph.', function() {
        getCoreRunner({
            input: [
                ['lolomo', 0, 'length'],
                ['lolomo', 'length']
            ],
            output: {
                jsonGraph: {
                    lolomo: {
                        length: 1,
                        0: {
                            length: 1337
                        }
                    }
                },
                paths: [
                    ['lolomo', 0, 'length'],
                    ['lolomo', 'length']
                ]
            },
            isJSONG: true,
            cache: {
                lolomo: {
                    length: 1,
                    0: {
                        length: 1337
                    }
                }
            }
        });
    });
    it('should get JSONGraph through references.', function() {
        getCoreRunner({
            input: [['lolomo', 0, 0, 'item', 'title']],
            isJSONG: true,
            output: {
                jsonGraph: cacheGenerator(0, 1),
                paths: [['lolomo', 0, 0, 'item', 'title']]
            },
            cache: cacheGenerator(0, 10)
        });
    });
    it('should get JSONGraph through references with complex pathSet.', function() {
        getCoreRunner({
            input: [['lolomo', {to: 1}, {length: 2}, 'item', 'title']],
            isJSONG: true,
            output: {
                jsonGraph: _.merge(cacheGenerator(0, 2), cacheGenerator(10, 2, undefined, false)),
                paths: [
                    ['lolomo', 0, 0, 'item', 'title'],
                    ['lolomo', 0, 1, 'item', 'title'],
                    ['lolomo', 1, 0, 'item', 'title'],
                    ['lolomo', 1, 1, 'item', 'title']
                ]
            },
            cache: cacheGenerator(0, 30)
        });
    });
    it('should throw getting JSONGraph if a KeySet includes another KeySet.', function() {
        var error;
        try {
            getCoreRunner({
                isJSONG: true,
                input: [['lolomo', [[{ to: 1}]], {length: 2}, 'item', 'title']],
                output: outputGenerator.lolomoGenerator([0, 1], [0, 1]),
                cache: cacheGenerator(0, 30)
            });
        } catch (e) {
            error = e;
        } finally {
            expect(error instanceof InvalidKeySetError).to.be.ok;
        }
    });
});

