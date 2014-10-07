# protractor-trx-reporter

> Reporter for the VisualStudio TRX format.

## Disclaimer
The trx reporter is provided by [Zuehlke Engineering AG] "as is" and the author disclaims all warranties with regard to this software.

## Installation

The easiest way is to keep `protractor-trx-reporter` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "protractor": "~0.16",
    "protractor-trx-reporter": "~0.1"
  }
}
```

You can simple do it by:
```bash
npm install protractor-trx-reporter --save-dev
```

## Configuration
```js
// protractor.conf.js
module.exports = function(config) {
    // creates the trx test report output xml
    onPrepare: function () {
        console.log('Adding TRX reporter');
        require('protractor-trx-reporter');
        jasmine.getEnv().addReporter(new jasmine.TrxReporter('ProtractorTestResults.trx'));
    },
};
```

----

For more information on Protractor see the [homepage].


[Zuehlke Engineering AG]: http://www.zuehlke.com/
[homepage]: https://github.com/angular/protractor
