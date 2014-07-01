(function() {
    console.log('protractor-trx-reporter: initializing');
    var grunt = require('../../grunt');
    grunt.log.writeln().success('protractor-trx-reporter: initializing');

    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }

    var builder = require('xmlbuilder');
    var fs = require('fs');

//    function elapsed(startTime, endTime) {
//        return (endTime - startTime)/1000;
//    }
//
//    function ISODateString(d) {
//        function pad(n) { return n < 10 ? '0'+n : n; }
//
//        return d.getFullYear() + '-' +
//            pad(d.getMonth()+1) + '-' +
//            pad(d.getDate()) + 'T' +
//            pad(d.getHours()) + ':' +
//            pad(d.getMinutes()) + ':' +
//            pad(d.getSeconds());
//    }

//    function trim(str) {
//        return str.replace(/^\s+/, "" ).replace(/\s+$/, "" );
//    }

    var getTimestamp = function () {
        // todo: use local time ?
        return (new Date()).toISOString().substr(0, 19);
    };

    var s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };

    var newGuid = function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    var userName = process.env['USERNAME'];
    var hostName = require('os').hostname();

    // todo: possibly add the browser name as in karma trx reporter
    var testRun = builder.create("TestRun", {version: '1.0', encoding: 'UTF-8'})
        .att('id', newGuid())
        .att('name', userName + '@' + hostName + ' ' + getTimestamp())
        .att('runUser', 'userName')
        .att('xmlns', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');

    testRun.ele('TestSettings')
        .att('name', 'Karma Test Run')
        .att('id', newGuid());

    var resultSummary = testRun.ele('ResultSummary');
    var counters = resultSummary.ele('Counters');
    var testDefinitions = testRun.ele('TestDefinitions');

    var testListIdNotInAList = "8c84fa94-04c1-424b-9868-57a2d4851a1d";
    var testLists = testRun.ele('TestLists');

    testLists.ele('TestList')
        .att('name', 'Results Not in a List')
        .att('id', testListIdNotInAList);

    // seems to be VS is expecting that exact id
    testLists.ele('TestList')
        .att('name', 'All Loaded Results')
        .att('id', "19431567-8539-422a-85d7-44ee4e166bda");

    var testEntries = testRun.ele('TestEntries');
    var results = testRun.ele('Results');

    // todo: checkout some nicer way to implement that than these counters
    var total = 0;
    var failed = 0;
    var passed = 0;

    /**
     * Generates TRX XML for the given spec run.
     * Allows the test results to be used in TFS CI
     *
     * @param {string} outputFile where to save the output
     */
    var TrxReporter = function(outputFile) {
        console.log('protractor-trx-reporter: setting output file to ' + outputFile);
        this.outputFile = outputFile || 'Default.trx';
    };

    TrxReporter.finished_at = null; // will be updated after all files have been written

    TrxReporter.prototype = {
        reportSpecStarting: function(spec) {
            spec.startTime = new Date();
            console.log('protractor-trx-reporter: set start time to' + spec.startTime);

            if (!spec.suite.startTime) {
                spec.suite.startTime = spec.startTime;
            }
        },

        // here we write the result of one test run
        reportSpecResults: function(spec) {
            console.log('protractor-trx-reporter: writing trx elements for ' + spec.description);

            var unitTestId = newGuid();
            var unitTestName = spec.description;
            // var className = spec.suite.join('.');
            var className = this.getFullName(spec.suite);
            var codeBase = className + '.' + unitTestName;

            var unitTest = testDefinitions.ele('UnitTest')
                .att('name', unitTestName)
                .att('id', unitTestId);
            var executionId = newGuid();
            unitTest.ele('Execution')
                .att('id', executionId);
            unitTest.ele('TestMethod')
                .att('codeBase', codeBase)
                .att('name', unitTestName)
                .att('className', className);

            testEntries.ele('TestEntry')
                .att('testId', unitTestId)
                .att('executionId', executionId)
                .att('testListId', testListIdNotInAList);

            var success = spec.results_.failedCount == 0;

            var unitTestResult = results.ele('UnitTestResult')
                .att('executionId', executionId)
                .att('testId', unitTestId)
                .att('testName', unitTestName)
                .att('computerName', hostName)
                // todo: calculate c# timespan from result.duration
                // .att('duration', ((spec.time || 0) / 1000))
                .att('startTime', getTimestamp())
                .att('endTime', getTimestamp())
                // todo: are there other test types?
                .att('testType', '13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b') // that guid seems to represent 'unit test'
                // todo: possibly write result.skipped also => Check out how this could happen.
                .att('outcome', success ? 'Passed' : 'Failed')
                .att('testListId', testListIdNotInAList);

            if (!success) {
                // todo: write message
                failed++;
                unitTestResult.ele('Output')
                    .ele('ErrorInfo')
                    .ele('Message', spec.results_.items_[0].message)
            } else {
                passed++;
            }

            total++;

//            var results = spec.results();
//            spec.didFail = !results.passed();
//            spec.duration = elapsed(spec.startTime, new Date());
//            spec.output = '<testcase classname="' + this.getFullName(spec.suite) +
//                '" name="' + escapeInvalidXmlChars(spec.description) + '" time="' + spec.duration + '">';
//
//            var failure = "";
//            var failures = 0;
//            var resultItems = results.getItems();
//            for (var i = 0; i < resultItems.length; i++) {
//                var result = resultItems[i];
//
//                if (result.type == 'expect' && result.passed && !result.passed()) {
//                    failures += 1;
//                    failure += (failures + ": " + escapeInvalidXmlChars(result.message) + " ");
//                }
//            }
//            if (failure) {
//                spec.output += "<failure>" + trim(failure) + "</failure>";
//            }
//            spec.output += "</testcase>";
        },

        // here we could write the results of the suite => don't think we need that for the TRX
        reportSuiteResults: function(suite) {
//            var results = suite.results();
//            var specs = suite.specs();
//            var specOutput = "";
//            // for JUnit results, let's only include directly failed tests (not nested suites')
//            var failedCount = 0;
//
//            suite.status = results.passed() ? 'Passed.' : 'Failed.';
//            if (results.totalCount === 0) { // todo: change this to check results.skipped
//                suite.status = 'Skipped.';
//            }
//
//            // if a suite has no (active?) specs, reportSpecStarting is never called
//            // and thus the suite has no startTime -- account for that here
//            suite.startTime = suite.startTime || new Date();
//            suite.duration = elapsed(suite.startTime, new Date());
//
//            for (var i = 0; i < specs.length; i++) {
//                failedCount += specs[i].didFail ? 1 : 0;
//                specOutput += "\n  " + specs[i].output;
//            }
//            suite.output = '\n<testsuite name="' + this.getFullName(suite) +
//                '" errors="0" tests="' + specs.length + '" failures="' + failedCount +
//                '" time="' + suite.duration + '" timestamp="' + ISODateString(suite.startTime) + '">';
//            suite.output += specOutput;
//            suite.output += "\n</testsuite>";
        },

        // here we write the results of the whole run
        reportRunnerResults: function(runner) {
            console.log('protractor-trx-reporter: writing trx elements for counters');

            resultSummary.att('outcome', failed == 0 ? 'Passed' : 'Failed');

            counters.att('total', total)
                .att('executed', total)
                .att('passed', passed)
                .att('error', failed != 0 ? 1 : 0)
                .att('failed', failed);

//            var suites = runner.suites();
//            for (var i = 0; i < suites.length; i++) {
//                var suite = suites[i];
//                var fileName = 'TEST-' + this.getFullName(suite, true) + '.xml';
//                var output = '<?xml version="1.0" encoding="UTF-8" ?>';
//                // if we are consolidating, only write out top-level suites
//                if (suite.parentSuite) {
//                    continue;
//                }
//                else output += "\n<testsuites>";
//                    output += this.getNestedOutput(suite);
//                    output += "\n</testsuites>";
//                this.writeFile(this.outputFile + fileName, output);
//            }

            console.log('protractor-trx-reporter: writing file ' + this.outputFile);

            fs.writeFile(this.outputFile, testRun.end({pretty: true}));

            // When all done, make it known on TrxReporter
            TrxReporter.finished_at = (new Date()).getTime();
        },

//        getNestedOutput: function(suite) {
//            var output = suite.output;
//            for (var i = 0; i < suite.suites().length; i++) {
//                output += this.getNestedOutput(suite.suites()[i]);
//            }
//
//            return output;
//        },

        getFullName: function(suite) {
            var fullName;
            fullName = suite.description;
            for (var parentSuite = suite.parentSuite; parentSuite; parentSuite = parentSuite.parentSuite) {
                fullName = parentSuite.description + '.' + fullName;
            }

            return fullName;
        },

        log: function(str) {
            var console = jasmine.getGlobal().console;

            if (console && console.log) {
                console.log(str);
            }
        }
    };

    console.log('protractor-trx-reporter: exporting trx reporter');

    // export public
    jasmine.TrxReporter = TrxReporter;
})();
