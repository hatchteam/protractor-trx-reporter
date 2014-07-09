/*jslint node: true */
/*global jasmine */
(function () {
    "use strict";
    if (!jasmine) {
        throw new Error("jasmine library does not exist in global namespace!");
    }

    var console = jasmine.getGlobal().console,
        builder = require('xmlbuilder'),
        fs = require('fs'),
        getTimestamp = function (date) {
            function pad(n) { return n < 10 ? '0' + n : n; }
            var currentDate = date !== undefined ? date : new Date(),
                month = currentDate.getMonth() + 1,
                day = currentDate.getDate();
            return (currentDate.getFullYear() + "-" + pad(month) + "-" + pad(day) + " " + pad(currentDate.getHours()) + ":" + pad(currentDate.getMinutes()) + ":" + pad(currentDate.getSeconds()));
        },

        s4 = function () {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        },

        newGuid = function () {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        },

        userName = process.env.USERNAME,
        hostName = require('os').hostname(),
        testListIdNotInAList = "8c84fa94-04c1-424b-9868-57a2d4851a1d",
        total = 0,
        failed = 0,
        passed = 0,
        // todo: possibly add the browser name as in karma trx reporter
        testRun = builder.create("TestRun", { version: '1.0', encoding: 'UTF-8' })
            .att('id', newGuid())
            .att('name', userName + '@' + hostName + ' ' + getTimestamp())
            .att('runUser', userName)
            .att('xmlns', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
            .ele('TestSettings')
                .att('name', 'Protractor Test Run')
                .att('id', newGuid())
            .up(),
        resultSummary = testRun.ele('ResultSummary'),
        counters = resultSummary.ele('Counters'),
        testDefinitions = testRun.ele('TestDefinitions'),
        testLists = testRun.ele('TestLists'),
        testEntries = testRun.ele('TestEntries'),
        results = testRun.ele('Results'),
        /**
            * Generates TRX XML for the given spec run.
            * Allows the test results to be used in TFS CI
            *
            * @param {string} outputFile where to save the output
            */
        TrxReporter = function (outputFile) {
            console.log('protractor-trx-reporter: setting output file to ' + outputFile);
            this.outputFile = outputFile || 'Default.trx';
        };

    console.log('protractor-trx-reporter: initializing');
    testLists.ele('TestList')
            .att('name', 'Results Not in a List')
            .att('id', testListIdNotInAList)
        .up()
    // seems to be VS is expecting that exact id
        .ele('TestList')
            .att('name', 'All Loaded Results')
            .att('id', "19431567-8539-422a-85d7-44ee4e166bda")
        .up();

    TrxReporter.finished_at = null; // will be updated after all files have been written

    TrxReporter.prototype = {
        reportSpecStarting: function (spec) {
            spec.startTime = new Date();
            console.log('protractor-trx-reporter: set start time to' + spec.startTime);

            if (!spec.suite.startTime) {
                spec.suite.startTime = spec.startTime;
            }
        },

        // here we write the result of one test run
        reportSpecResults: function (spec) {
            console.log('protractor-trx-reporter: writing trx elements for ' + spec.description);
            spec.finished_at = new Date();

            var unitTestId = newGuid(),
                unitTestName = spec.description,
                className = this.getFullName(spec.suite),
                codeBase = className + '.' + unitTestName,
                executionId = newGuid(),
                success = spec.results_.failedCount === 0,
                unitTestResult = results.ele('UnitTestResult')
                    .att('executionId', executionId)
                    .att('testId', unitTestId)
                    .att('testName', unitTestName)
                    .att('computerName', hostName)
                    .att('duration', "0:0:" + (spec.finished_at - spec.startTime) / 1000)
                    .att('startTime', getTimestamp(spec.startTime))
                    .att('endTime', getTimestamp(spec.finished_at))
                    // todo: are there other test types?
                    .att('testType', '13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b') // that guid seems to represent 'unit test'
                    // todo: possibly write result.skipped also => Check out how this could happen.
                    .att('outcome', success ? 'Passed' : 'Failed')
                    .att('testListId', testListIdNotInAList);
            testDefinitions.ele('UnitTest')
                    .att('name', unitTestName)
                    .att('id', unitTestId)
                    .ele('Execution')
                        .att('id', executionId).up()
                    .ele('TestMethod')
                        .att('codeBase', codeBase)
                        .att('name', unitTestName)
                        .att('className', className);
            testEntries.ele('TestEntry')
                .att('testId', unitTestId)
                .att('executionId', executionId)
                .att('testListId', testListIdNotInAList);
            if (!success) {
                failed += 1;
                unitTestResult.ele('Output')
                    .ele('ErrorInfo')
                    .ele('Message', spec.results_.items_[0].message);
            } else {
                passed += 1;
            }

            total += 1;
        },

        // here we write the results of the whole run
        reportRunnerResults: function () {
            console.log('protractor-trx-reporter: writing trx elements for counters');
            resultSummary.att('outcome', failed === 0 ? 'Passed' : 'Failed');
            counters.att('total', total)
                .att('executed', total)
                .att('passed', passed)
                .att('error', failed !== 0 ? 1 : 0)
                .att('failed', failed);

            console.log('protractor-trx-reporter: writing file ' + this.outputFile);

            fs.writeFile(this.outputFile, testRun.end({ pretty: true }));

            // When all done, make it known on TrxReporter
            TrxReporter.finished_at = (new Date()).getTime();
        },

        getFullName: function (suite) {
            var fullName,
                parentSuite;
            fullName = suite.description;
            for (parentSuite = suite.parentSuite; parentSuite; parentSuite = parentSuite.parentSuite) {
                fullName = parentSuite.description + '.' + fullName;
            }

            return fullName;
        },

        log: function (str) {
            if (console && console.log) {
                console.log(str);
            }
        }
    };

    console.log('protractor-trx-reporter: exporting trx reporter');

    // export public
    jasmine.TrxReporter = TrxReporter;
}());