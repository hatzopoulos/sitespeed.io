/**
 * Sitespeed.io - How speedy is your site? (http://www.sitespeed.io)
 * Copyright (c) 2014, Peter Hedenskog, Tobias Lidskog
 * and other contributors
 * Released under the Apache 2.0 License
 */
'use strict';
/*eslint no-process-exit:0*/

var fs = require('fs-extra'),
  fileHelper = require('./util/fileHelpers'),
  defaultConfig = require('../conf/defaultConfig'),
  EOL = require('os').EOL,
  validUrl = require('valid-url'),
  nomnom = require('nomnom');

var permissionsBits = parseInt('777', 8);

var checkPermissionSynch = function(mode, mask) {
  return ((mode & permissionsBits) & mask) === mask;
};

var validatePathOption = function(optionName, path) {
  if (!fs.existsSync(path)) {
    return '--' + optionName + ': \'' + path + '\' can\'t be found';
  }
};

var cli = nomnom.help(
    'sitespeed.io is a tool that helps you analyze your website performance and show you what you should optimize, more info at http://www.sitespeed.io.' +
    EOL +
    'To collect timings in Chrome you need to install the ChromeDriver. Firefox works out of the box. Example:' + EOL +
    '$ sitespeed.io -u http://www.sitespeed.io -b chrome,firefox'
  ).options({
    url: {
      abbr: 'u',
      metavar: '<URL>',
      help: 'The start url that will be used when crawling.',
      callback: function(url) {
        if (!validUrl.isWebUri(url)) {
          return '--url: \'' + url + '\' is not a valid url (you need to include protocol)';
        }
      }
    },
    file: {
      abbr: 'f',
      metavar: '<FILE>',
      help: 'The path to a plain text file with one URL on each row. Each URL will be analyzed.',
      callback: function(path) { return validatePathOption('file', path); }
    },
    sites: {
      metavar: '<FILE>',
      help: 'The path to a plain text file with one URL on each row. Each URL is crawled.',
      callback: function(path) { return validatePathOption('sites', path); },
      transform: function(path) {
        return fileHelper.getFileAsArray(path);
      }
    },
    version: {
      flag: true,
      abbr: 'V',
      help: 'Display the sitespeed.io version.',
      callback: function() {
        return require('../package.json').version;
      }
    },
    silent: {
      flag: true,
      help: 'Only output info in the logs, not to the console.'
    },
    verbose: {
      flag: true,
      abbr: 'v',
      help: 'Enable verbose logging.'
    },
    noColor: {
      flag: true,
      default: false,
      help: 'Don\'t use colors in console output.'
    },
    deep: {
      abbr: 'd',
      metavar: '<INTEGER>',
      default: defaultConfig.deep,
      help: 'How deep to crawl.',
      callback: function(deep) {
        if (isNaN(parseInt(deep))) {
          return '--deep: You must specify an integer of how deep you want to crawl';
        }
      }
    },
    containInPath: {
      abbr: 'c',
      metavar: '<KEYWORD>',
      help: 'Only crawl URLs that contains this in the path.'
    },
    skip: {
      abbr: 's',
      metavar: '<KEYWORD>',
      help: 'Do not crawl pages that contains this in the path.'
    },
    threads: {
      abbr: 't',
      metavar: '<NOOFTHREADS>',
      default: defaultConfig.threads,
      help: 'The number of threads/processes that will analyze pages.',
      callback: function(threads) {
        var int = parseInt(threads, 10);
        if (isNaN(int)) {
          return '--threads: You must specify an integer of how many processes/threads that will analyze your page';
        } else if (int <= 0) {
          return '--threads: You must specify a positive integer';
        }
      }
    },
    name: {
      metavar: '<NAME>',
      help: 'Give your test a name, it will be added to all HTML pages.'
    },
    memory: {
      metavar: '<INTEGER>',
      default: defaultConfig.memory,
      help: 'How much memory the Java processed will have (in mb).'
    },
    resultBaseDir: {
      abbr: 'r',
      metavar: '<DIR>',
      default: defaultConfig.resultBaseDir,
      help: 'The result base directory, the base dir where the result ends up.',
      callback: function(path) {
        if (!fs.existsSync(path)) {
          try {
            fs.mkdirsSync(path);
          } catch (e) {
            return '--resultBaseDir: Couldn\'t create the result base dir (' + e.code + ')';
          }
        }
      }
    },
    outputFolderName: {
      help: 'Default the folder name is a date of format yyyy-mm-dd-HH-MM-ss'
    },
    suppressDomainFolder: {
      help: 'Do not use the domain folder in the output directory',
      flag: true
    },
    userAgent: {
      metavar: '<USER-AGENT>',
      default: defaultConfig.userAgent,
      help: 'The full User Agent string, default is Chrome for MacOSX. [userAgent|ipad|iphone].'
    },
    viewPort: {
      metavar: '<WidthxHeight>',
      default: defaultConfig.viewPort,
      help: 'The view port, the page viewport size WidthxHeight like 400x300.'
    },
    yslow: {
      abbr: 'y',
      metavar: '<FILE>',
      default: defaultConfig.yslow,
      help: 'The compiled YSlow file. Use this if you have your own rules.',
      callback: function(path) { return validatePathOption('yslow', path); }
    },
    headless: {
    default: defaultConfig.headless,
      help: 'Choose which backend to use for headless [phantomjs|slimerjs]'
    },
    ruleSet: {
      metavar: '<RULE-SET>',
      default: defaultConfig.ruleSet,
      help: 'Which ruleset to use.'
    },
    limitFile: {
      metavar: '<PATH>',
      help: 'The path to the limit configuration file.',
      callback: function(path) { return validatePathOption('limitFile', path); }
    },
    basicAuth: {
      metavar: '<USERNAME:PASSWORD>',
      help: 'Basic auth user & password.'
    },
    browser: {
      abbr: 'b',
      metavar: '<BROWSER>',
      help: 'Choose which browser to use to collect timing data. Use multiple browsers in a comma separated list (firefox|chrome|headless)',
      callback: function(browsers) {
        var b = browsers.split(','),
          invalidBrowsers = b.filter(function(browser) {
            return defaultConfig.supportedBrowsers.indexOf(browser.toLowerCase()) < 0;
          });

        if (invalidBrowsers.length > 0) {
          return '--browser: You specified a browser that is not supported:' + invalidBrowsers;
        }
      }
    },
    connection: {
      default: 'cable',
      help: 'Limit the speed by simulating connection types. Choose between ' + defaultConfig.connection
    },
    btConfig: {
      metavar: '<FILE>',
      help: 'Additional BrowserTime JSON configuration as a file',
      callback: function(path) { return validatePathOption('btConfig', path); },
      transform: function(path) {
        return fileHelper.getFileAsJSON(path);
      }
    },
    profile: {
      metavar: '<desktop|mobile>',
      choices: ['desktop', 'mobile'],
      default: defaultConfig.profile,
      help: 'Choose between testing for desktop or mobile. Testing for desktop will use desktop rules & user agents and vice verca.'
    },
    no: {
      abbr: 'n',
      metavar: '<NUMBEROFTIMES>',
      default: defaultConfig.no,
      help: 'The number of times you should test each URL when fetching timing metrics. Default is ' + defaultConfig.no +
        ' times.',
      callback: function(n) {
        var int = parseInt(n, 10);
        if (isNaN(int)) {
          return '--no: You must specify an integer of how many times you want to test one URL';
        } else if (int <= 0) {
          return '--no: You must specify a positive integer of how many times you want to test one URL';
        }
      }
    },
    screenshot: {
      flag: true,
      help: 'Take screenshots for each page (using the configured view port).'
    },
    junit: {
      flag: true,
      help: 'Create JUnit output to the console.'
    },
    tap: {
      flag: true,
      help: 'Create TAP output to the console.'
    },
    skipTest: {
      metavar: '<ruleid1,ruleid2,...>',
      help: 'A comma separated list of rules to skip when generating JUnit/TAP/budget output.'
    },
    testData: {
      default: defaultConfig.testData,
      help: 'Choose which data to send test when generating TAP/JUnit output or testing a budget. Default is all available [rules,page,timings,wpt,gpsi]'
    },
    budget: {
      metavar: '<FILE>',
      help: 'A file containing the web perf budget rules. See http://www.sitespeed.io/documentation/#performance-budget',
      callback: function(path) { return validatePathOption('budget', path); },
      transform: function(path) {
        return fileHelper.getFileAsJSON(path);
      }
    },
    maxPagesToTest: {
      abbr: 'm',
      metavar: '<NUMBEROFPAGES>',
      help: 'The max number of pages to test. Default is no limit.'
    },
    storeJson: {
      flag: false,
      help: 'Store all collected data as JSON.'
    },
    proxy: {
      abbr: 'p',
      metavar: '<PROXY>',
      help: 'http://proxy.soulgalore.com:80'
    },
    cdns: {
      metavar: '<cdn1.com,cdn.cdn2.net>',
      list: true,
      help: 'A comma separated list of additional CDNs.'
    },
    postTasksDir: {
      metavar: '<DIR>',
      help: 'The directory where you have your extra post tasks.',
      callback: function(path) { return validatePathOption('postTasksDir', path); }
    },
    boxes: {
      metavar: '<box1,box2>',
      list: true,
      help: 'The boxes showed on site summary page, see http://www.sitespeed.io/documentation/#configure-boxes-on-summary-page'
    },
    columns: {
      abbr: 'c',
      metavar: '<column1,column2>',
      list: true,
      help: 'The columns showed on detailed page summary table, see http://www.sitespeed.io/documentation/#configure-columns-on-pages-page'
    },
    configFile: {
      metavar: '<PATH>',
      help: 'The path to a sitespeed.io config.json file, if it exists all other input parameters will be overridden.'
    },
    // TODO How to override existing
    aggregators: {
      metavar: '<PATH>',
      help: 'The path to a directory with extra aggregators.'
    },
    // TODO maybe collectors are overkill
    collectors: {
      metavar: '<PATH>',
      help: 'The path to a directory with extra collectors.'
    },
    graphiteHost: {
      metavar: '<HOST>',
      help: 'The Graphite host.'
    },
    graphitePort: {
      metavar: '<INTEGER>',
      default: defaultConfig.graphitePort,
      help: 'The Graphite port.'
    },
    graphiteNamespace: {
      metavar: '<NAMESPACE>',
      default: defaultConfig.graphiteNamespace,
      help: 'The namespace of the data sent to Graphite.'
    },
    graphiteData: {
      default: defaultConfig.graphiteData,
      help: 'Choose which data to send to Graphite by a comma separated list. Default all data is sent. [summary,rules,pagemetrics,timings]'
    },
    gpsiKey: {
      help: 'Your Google API Key, configure it to also fetch data from Google Page Speed Insights.'
    },
    noYslow: {
      flag: true,
      help: 'Set to true to turn off collecting metrics using YSlow.'
    },
    html: {
      flag: true,
      default: true,
      help: 'Create HTML reports. Default to true. Set no-html to disable HTML reports.'
    },
    wptConfig: {
      metavar: '<FILE>',
      help: 'WebPageTest configuration, see https://github.com/marcelduran/webpagetest-api runTest method ',
      callback: function(path) { return validatePathOption('wptConfig', path); },
      transform: function(path) {
        return fileHelper.getFileAsJSON(path);
      }
    },
    wptHost: {
      metavar: '<domain>',
      help: 'The domain of your WebPageTest instance.'
    },
    wptKey: {
      metavar: '<KEY>',
      help: 'The API key if running on webpagetest on the public instances.'
    },
    requestHeaders: {
      metavar: '<FILE>',
      help: 'Any request headers to use, a file with JSON form of {\"name\":\"value\",\"name2\":\"value\"}. Not supported for WPT & GPSI.',
      callback: function(path) { return validatePathOption('requestHeaders', path); },
      transform: function(path) {
        return fileHelper.getFileAsJSON(path);
      }
    },
    phantomjsPath: {
      metavar: '<PATH>',
      help: 'The full path to the phantomjs binary, to override the supplied version',
      callback: function(path) {
        var isValid = false;

        try {
          var stats = fs.statSync(path);

          if (stats.isFile() && checkPermissionSynch(stats.mode, 1)) {
            isValid = true;
          }
        } catch (e) {
          if (!(e.code === 'ENOENT')) {
            throw e;
          }
        }

        if (!isValid) {
          return '--requestHeaders: \'' + path + '\' is not an executable file!';
        }
      }
    }
  }).parse();

if ((!cli.url) && (!cli.file) && (!cli.sites)) {
  console.log('You must specify either a URL to test or a file with URL:s');
  console.log(nomnom.getUsage());
  process.exit(1);
}

if (cli.file) {
  cli.urls = fileHelper.getFileAsArray(cli.file);
}

module.exports = cli;
