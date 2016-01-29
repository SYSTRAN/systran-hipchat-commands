// Copyright (c) 2016 SYSTRAN S.A.

var request = require('request');
var _ = require('lodash');
var ack = require('ac-koa').require('hipchat');
var pkg = require('./package.json');
var app = ack(pkg);

var systranApiKey = '4d86d454-b0ab-4606-bd6e-be137840f146';

function detectLanguage(input, cb) {
  request({
    url: 'https://api-platform.systran.net/nlp/lid/detectLanguage/document',
    qs: {
      key: systranApiKey,
      format: 'text',
      input: input
    }
  } , function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to detect language'));
      return;
    }

    try {
      body = JSON.parse(body);
    }
    catch (e) {
      cb(e);
      return;
    }

    console.log('SYSTRAN Platform', 'detectLanguage', 'response', body);

    if (body && body.detectedLanguages && body.detectedLanguages[0]) {
      cb(null, body.detectedLanguages[0].lang, body.detectedLanguages[0].confidence);
    } else {
      cb(new Error('Unable to detect language'));
    }
  });
}

function translate(input, source, target, cb) {
  var i = input.replace(/(:[a-zA-Z0-9_\-\+]+:)/g, "<dnt_insertion>$1</dnt_insertion>").replace(/(<@[a-zA-Z0-9_\-\+\.\|]+>)/g, "<dnt_insertion>$1</dnt_insertion>");

  request({
    url: 'https://api-platform.systran.net/translation/text/translate',
    qs: {
      key: systranApiKey,
      source: source || 'auto',
      target: target,
      format: 'text',
      input: i
    }
  }, function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to translate'));
      return;
    }

    try {
      body = JSON.parse(body);
    } catch (e) {
      cb(e);
      return;
    }

    console.log('SYSTRAN Platform', 'translate', 'response', body);

    if (body && body.outputs && body.outputs[0] && body.outputs[0].output) {
      cb(null, body.outputs[0].output);
    } else if (source !== 'en' && target !== 'en' &&
               body && body.outputs && body.outputs[0] && body.outputs[0].error &&
               body.outputs[0].error.match(/No Queue defined for Route/)) {
      // Language Pair not available, pivot via English
      translate(input, source, 'en', function(err, outputEn) {
        if (err) {
          cb(err);
          return;
        }

        translate(outputEn, 'en', target, cb);
      });
    } else {
      cb(new Error('Unable to translate'));
    }
  });
}

function translationSupportedLanguages(cb) {
  request({
    url: 'https://api-platform.systran.net/translation/supportedLanguages',
    qs: {
      key: systranApiKey
    }
  }, function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to get supported languages'));
      return;
    }

    try {
      body = JSON.parse(body);
    }
    catch (e) {
      cb(e);
      return;
    }

    cb(null, body);
  });
}

function dictionarySupportedLanguages(cb) {
  request({
    url: 'https://api-platform.systran.net/resources/dictionary/lookup/supportedLanguages',
    qs: {
      key: systranApiKey
    }
  }, function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to get supported languages'));
      return;
    }

    try {
      body = JSON.parse(body);
    }
    catch (e) {
      cb(e);
      return;
    }

    cb(null, body);
  });
}

function dictionary(input, source, target, cb) {
  request({
    url: 'https://api-platform.systran.net/resources/dictionary/lookup',
    qs: {
      key: systranApiKey,
      source: source,
      target: target,
      input: input
    }
  }, function(err, resp, body) {
    if (err || resp.statusCode !== 200) {
      cb(err || new Error(body || 'Unable to lookup'));
      return;
    }

    try {
      body = JSON.parse(body);
    } catch (e) {
      cb(e);
      return;
    }

    console.log('SYSTRAN Platform', 'lookup', 'response', body);

    if (body && body.outputs && body.outputs[0] && body.outputs[0].output) {
      cb(null, body.outputs[0].output);
    } else {
      cb(new Error('Unable to lookup'));
    }
  });
}

var targets = [];

function helpTranslate() {
  return '<strong>Help:</strong><br>' +
    '<strong>/translate [target language: es, en, fr…] [message to translate]</strong> (example: /translate fr How are you today?)<br>' +
    '<strong>/translate languages</strong>  -  returns the list of available languages<br>' +
    '<strong>/translate help</strong>  -  display the help message<br>';
}

var lps = [];

function helpDictionary() {
  return '<strong>Help:</strong><br>' +
    '<strong>/dictionary [source language: es en fr] [target language: es, en, fr…] [term]</strong> (example: /dictionary en ko plane)<br>' +
    '<strong>/dictionary languages</strong>  -  returns the list of available language pairs<br>' +
    '<strong>/dictionary help</strong>  -  display the help message<br>';
}

var addon = app.addon()
  .hipchat()
  .allowGlobal(true)
  .allowRoom(true)
  .scopes('send_notification');

addon.webhook('room_message', /^\/translate\s*(.*)$/, function *() {
  var text = this.match && this.match[1];
  console.log(text);
  var targetLang;

  if (! text || text === 'help') {
    yield this.roomClient.sendNotification(helpTranslate());
  } else if (text === 'languages') {
    yield this.roomClient.sendNotification('The available language pairs are ' + lps.join(', '));
  } else if (targets.some(function(t) { targetLang = t; return text.indexOf(t) === 0; })) {
    text = text.substr(targetLang.length + 1);
    console.log('Translate to', targetLang, text);

    detectLanguage(text, function(err, lang) {
      if (err) {
        console.error('Error', 'detectLanguage', err);
        this.roomClient.sendNotification('Unable to translate');
        return;
      }

      if (lang === targetLang) {
        this.roomClient.sendNotification(text);
        return;
      }

      translate(text, lang, targetLang, function(err, output) {
        if (err) {
          console.error('Error', 'translate', err);
          this.roomClient.sendNotification('Unable to translate');
          return;
        }

        this.roomClient.sendNotification('<strong>' + lang + ':</strong> ' + text + '<br><strong>' + targetLang + ':</strong> ' + output);
      }.bind(this));
    }.bind(this));
  } else {
    yield this.roomClient.sendNotification(helpDictionary());
  }
});

addon.webhook('room_message', /^\/dictionary\s*(.*)$/, function *() {
  var text = this.match && this.match[1];
  console.log(text);
  var lp;

  if (! text  || text === 'help') {
    yield this.roomClient.sendNotification(helpDictionary());
  } else if (text === 'languages') {
    yield this.roomClient.sendNotification('The available language pairs are ' + lps.join(', '));
  } else if (lps.some(function(e) { lp = e; return text.indexOf(e) === 0; })) {
    var pos = lp.indexOf(' ');
    var sourceLang = lp.substr(0, pos);
    var targetLang = lp.substr(pos + 1);
    text = text.substr(lp.length + 1);
    console.log('Dictionary lookup', sourceLang, targetLang, text);

    dictionary(text, sourceLang, targetLang, function(err, output) {
      if (err) {
        console.error('Error', 'dictionary', err);
        this.roomClient.sendNotification('Unable to lookup');
        return;
      }

      var j= 'Dictionary lookup <strong>' + sourceLang + '</strong> <strong>' + targetLang + '</strong> <strong>' +text + '</strong><br>';

      if (output.matches) {
        j += output.matches.map(function(m) { 
          console.log(m.source); 
          var mm = '&#x1F535; ' + m.source.lemma + ' (' + m.source.pos + ')<br>';

          if (m.targets) {
            mm += m.targets.map(function(t) {
              var tt = '&#x1F539; ' + t.lemma + '<br>';

              if (t.invmeanings)
                tt += '&#x21AA; ' + t.invmeanings.join(', ') + '<br>';

              if (t.expressions) {
                tt += t.expressions.map(function(e) { return '<strong>' + e.source + '</strong>: ' + e.target; }).join('<br>');
              }
              return tt;
            }).join('<br>');
          }

          if (m.other_expressions) {
            var tt = '&#x1F539; Other expressions<br>';
            tt += m.other_expressions.map(function(e) { return '<strong>' + e.source + '</strong>: ' + e.target; }).join('<br>');
            mm += tt;
          }

          return mm;
        }).join('<br>');
      }

      this.roomClient.sendNotification(j);
    }.bind(this));
  } else {
    yield this.roomClient.sendNotification(helpDictionary());
  }
});

translationSupportedLanguages(function(err, data) {
  if (err) {
    console.error('Error', 'supportedLanguages', err);
    process.exit(1);
  }

  if (! data.languagePairs) {
    console.error('No language pairs');
    process.exit(1);
  }

  targets = _.uniq(_.map(data.languagePairs, 'target'));
  console.log('Translation target languages', targets.join(', '));

  dictionarySupportedLanguages(function(err, data) {
    if (err) {
      console.error('Error', 'supportedLanguages', err);
      process.exit(1);
    }

    if (! data.languagePairs) {
      console.error('No language pairs');
      process.exit(1);
    }

    lps = _.uniq(data.languagePairs.map(function(e) { return e.source + ' ' + e.target; }));
    console.log('Dictionary language pairs', lps.join(', '));

    app.listen();
  });
});
