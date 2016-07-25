// Slackのbotのユーザーネーム
var SLACK_USERNAME = 'Github未読かも〜 ';

// Slackのbotのアイコン
var SLACK_ICON_EMOJI = ':eyes:';

var DAY_OF_THE_WEEK =  ['日', '月', '火', '水', '木', '金', '土'];
var GITHUB_ACCESS_TOKEN = ScriptProperties.getProperty('GITHUB_ACCESS_TOKEN');
var SLACK_INCOMING_WEBHOOK_URL = ScriptProperties.getProperty('SLACK_INCOMING_WEBHOOK_URL');
var SLACK_POSTED_DESTINATION_CHANNEL = ScriptProperties.getProperty('SLACK_POSTED_DESTINATION_CHANNEL');

function run() {
  if (!beRun()) return;

  var slack = new Slack({ 
    incoming_webhook_url: SLACK_INCOMING_WEBHOOK_URL,
    username: SLACK_USERNAME,
    icon_emoji: SLACK_ICON_EMOJI,
  });

  var github = new Github(GITHUB_ACCESS_TOKEN);
  github.fetchNotifications();

  var postText = '';
  while (github.hasNext()) {
    var record = github.next();
    var updatedAt = String(record.updated_at).split(/T/)[0];
    postText += ':information_desk_person: ' + updatedAt + ' ' + record.subject.title + "\n"
      + '[' + record.repository.name + '] '
      + github.subjectUrl(record)
      + '\n\n';
    if (github.index + 1 >= 10) break;
  }

  if (postText !== '') {
    slack.postByIncomingWebHook({
      channel: SLACK_POSTED_DESTINATION_CHANNEL,
      text: postText,
    });
  }
}

function beRun() {
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getRange(2, 1).getValue() === 'OFF') return false;

  var date = new Date();
  var dayOfWeek = sheet.getRange(2, 2).getValue();
  var dayOfWeeks = dayOfWeek.split(/,/);
  var isMatchDayOfWeek = false;
  for (var i = 0; i < dayOfWeeks.length; i++) {
    if (DAY_OF_THE_WEEK[date.getDay()] === dayOfWeeks[i]) {
      isMatchDayOfWeek = true;
    }
  }
  if (!isMatchDayOfWeek) return false;

  var nowTime = timeToNumber(date);
  if (nowTime >= timeToNumber(sheet.getRange(2, 3).getValue()) && nowTime <= timeToNumber(sheet.getRange(2, 4).getValue())) {
    return true;
  }

  return false;
}

function timeToNumber(date) {
  if (!date.getHours) return 0;
  var timeString = String(date.getHours()) + (date.getMinutes() >= 10 ? String(date.getMinutes()) : '0' + String(date.getMinutes()));
  return Number(timeString);
}

var Slack = function(params) {
  if (params) {
    if (params.incoming_webhook_url) this.incoming_webhook_url = params.incoming_webhook_url;
    this.username = params.username ? params.username : 'Github Notifications';
    this.icon_emoji = params.icon_emoji ? params.icon_emoji : ':ghost:';
  }
};

Slack.prototype.postByIncomingWebHook = function(payload) {
  if (!this.incoming_webhook_url) return;
  payload.username = this.username;
  payload.icon_emoji = this.icon_emoji;

  var options = {
    method: 'POST',
    payload: JSON.stringify(payload),
  };

  var url = this.incoming_webhook_url;
  var response = UrlFetchApp.fetch(url, options);
  var content = response.getContentText("UTF-8");
  Logger.log(content);
};

var Github = function(token) {
  this.CONST = {
    BASE_URL: 'https://github.com/',
    GITHUB_API: 'https://api.github.com/notifications?participating=true&access_token=',
  };
  this.token = token;
  this.responseJson = null;
  this.index = -1;
};

Github.prototype.fetchNotifications = function() {
  var url = this.CONST.GITHUB_API + this.token;
  var response = UrlFetchApp.fetch(url);
  this.responseJson = JSON.parse(response);
  this.index = -1;
};

Github.prototype.hasNext = function() {
  if (this.responseJson === null) return false;
  var index = this.index + 1;
  return (index < this.responseJson.length);
};

Github.prototype.next = function() {
  if (this.responseJson === null) return false;
  var index = this.index + 1;
  if (index >= this.responseJson.length) return false;
  this.index = index;
  return this.responseJson[this.index];
};

Github.prototype.subjectUrl = function(record) {
  var url = this.CONST.BASE_URL + record.repository.full_name + '/';

  var type = '';  
  switch(record.subject.type) {
    case 'Issue':
      type = 'issues';
      break;
    case 'PullRequest':
      type = 'pull';
      break;
  }

  if (type) {
    url += type + '/';
    if (record.subject.url) {
      var parts = record.subject.url.split('/');
      url += parts[parts.length - 1];
    }
  }
  return url;
};

