# protractor-trx-reporter

> Reporter for the VisualStudio TRX format.

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


[homepage]: https://github.com/angular/protractor
