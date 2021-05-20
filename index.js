const Twitter = require('twitter');
const request = require('request');
const crypto = require('crypto');

const config = require('./config.js');
const slack = require('./lib/slack.js')

const markets = {};

const ticket_id = 0

const client = new Twitter({
	consumer_key: config.twitterAPI.consumer_key,
	consumer_secret: config.twitterAPI.consumer_secret,
	access_token_key: config.twitterAPI.access_token_key,
	access_token_secret: config.twitterAPI.access_token_secret,
});


const round = (num, decimals = 8, down = false) => {
	if (typeof num !== 'number') num = parseFloat(num);
	const multiplier = 10 ** decimals;
	let roundedNumber = Math.round(num * multiplier) / multiplier;
	if (down) roundedNumber = Math.floor(num * multiplier) / multiplier;
	return Number(roundedNumber);
}

const getID = async (username) => {
	return new Promise((resolve, reject) => {
		client.get('users/lookup', { screen_name: username }, (error, tweets, response) => {
			if (error) console.log(username, error);
			const twitterID = JSON.parse(response.body)[0].id_str;
			resolve(twitterID);
		});
	});
}

const sortFollowerIDs = () => {
	return new Promise((resolve, reject) => {
		const followerIDs = [];
		config.follows.forEach(async (screenname, i) => {
			await new Promise(r => setTimeout(r, i * 500));
			const twitterID = await getID(screenname);
			console.log(`TwitterID: ${screenname} ${twitterID}`);
			followerIDs.push(twitterID);
			if (followerIDs.length === config.follows.length) resolve(followerIDs);
		});
	});
}

const startStream = async (followerIDs) => {
	const filter = { filter_level: 'none', follow: followerIDs.join(',') };
	client.stream('statuses/filter', filter, (stream) => {
		stream.on('data', (tweet) => {
			let tweetText = tweet.text;
			if (tweet.extended_tweet && tweet.extended_tweet.full_text) {
				tweetText = tweet.extended_tweet.full_text;
			}
			tweetText = tweetText.toLowerCase();
			if (!followerIDs.includes(tweet.user.id_str)) return false;
			console.log(`[${tweet.user.screen_name}] ${tweetText}`);
			config.keywords.forEach((kw) => {
				const keyword = kw.toLowerCase();
				if (tweetText.includes(keyword)) {
					executeStubTrade(keyword);
				}
			});
		});
		stream.on('error', (error) => {
			console.log(error);
		});
		stream.on('disconnect', (error) => {
			console.log('Stream Disconnected...');
			startStream();
		});
		console.log('Twitter API Stream Started');
		setTimeout(() => {
			stream.destroy();
			startStream(followerIDs);
		}, 3600000); // reset stream
	});
}

const sortMarkets = async () => {
	request('https://ftx.com/api/markets', (err, res, ticket) => {
		if (err) console.log(err);
		if (ticket) {
			const ticketObject = JSON.parse(ticket);
			ticketObject.result.forEach((market) => {
				if (!market.name.includes('-PERP')) return false;
				markets[market.name] = market.price; // USD
			});
		} else {
			console.log(ticket);
		}
	});
}

const stubOrder = (market, quantity) => {
	print(market, quantity)
}

const ftxMarketPrice = (market) => {
	const ts = new Date().getTime();

	const queryString = `${ts}GET/api/market${market}`;
	const signature = crypto.createHmac('sha256', config.ftxAPI.apiSecret).update(queryString).digest('hex');
	const uri = `https://ftx.com/api/market`;
	const headers = {
		"FTX-KEY": config.ftxAPI.apiKey,
		"FTX-TS": String(ts),
		"FTX-SIGN": signature,
		"FTX-SUBACCOUNT": config.ftxAPI.subAccount
	};
	request({ headers, uri, method: 'GET', body: query, json: true }, function (err, res, price) {
		if (err) console.log(err);
		if (!price) {
			console.log(ticket);
		}
	});
}

const ftxOrder = (market, quantity) => {
	const ts = new Date().getTime();
	const query = {
		market: market,
		side: 'buy',
		size: quantity,
		type: 'market',
		price: 0,
	}
	const queryString = `${ts}POST/api/orders${JSON.stringify(query)}`;
	const signature = crypto.createHmac('sha256', config.ftxAPI.apiSecret).update(queryString).digest('hex');
	const uri = `https://ftx.com/api/orders`;
	const headers = {
		"FTX-KEY": config.ftxAPI.apiKey,
		"FTX-TS": String(ts),
		"FTX-SIGN": signature,
		"FTX-SUBACCOUNT": config.ftxAPI.subAccount
	};
	request({ headers, uri, method: 'POST', body: query, json: true }, function (err, res, ticket) {
		if (err) console.log(err);
		if (ticket && ticket.result && ticket.result.id) {
			console.log(`Order confirmed: ${ticket.result.id}`);
		} else {
			console.log(ticket);
		}
	});
}

const ftxTrailingStop = (market, quantity, stop) => {
	const ts = new Date().getTime();
	const query = {
		market: market,
		side: 'sell',
		trailValue: stop,
		size: quantity,
		type: 'trailingStop',
		reduceOnly: true,
	}
	const queryString = `${ts}POST/api/conditional_orders${JSON.stringify(query)}`;
	const signature = crypto.createHmac('sha256', config.ftxAPI.apiSecret).update(queryString).digest('hex');
	const uri = `https://ftx.com/api/conditional_orders`;
	const headers = {
		"FTX-KEY": config.ftxAPI.apiKey,
		"FTX-TS": String(ts),
		"FTX-SIGN": signature,
		"FTX-SUBACCOUNT": config.ftxAPI.subAccount
	};
	request({ headers, uri, method: 'POST', body: query, json: true }, function (err, res, ticket) {
		if (err) console.log(err);
		if (ticket && ticket.result && ticket.result.id) {
			console.log(`Trailing Stop Loss Set: ${ticket.result.id}`);
		} else {
			console.log(ticket);
		}
	});
}

const executeTrade = (keyword) => {
	const cleanKW = keyword.split(/[^a-zA-Z0-9]/).join('').toUpperCase();
	const market = config.market.split('{KEYWORD}').join(cleanKW);
	if (!markets[market]) return false;
	const price = markets[market];
	const quantity = round(config.usdValue / price);
	console.log(`Executing trade ${market} ${quantity}`);
	ftxOrder(market, quantity);
	const trailingStop = round((config.trailingStopPercentage * -0.01) * price);
	console.log(`Setting trailing stop ${market} ${quantity} ${trailingStop}`);
	ftxTrailingStop(market, quantity, trailingStop);
}

const executeStubTrade = (keyword) => {
	const ts = new Date().getTime();
	const cleanKW = keyword.split(/[^a-zA-Z0-9]/).join('').toUpperCase();
	const market = config.market.split('{KEYWORD}').join(cleanKW);
	if (!markets[market]) return false;
	const price = markets[market];
	const quantity = round(config.usdValue / price);
	console.log(ts + ': ' + `Executing trade ${market} ${quantity}`);
}

const init = async () => {
	const followerIDs = await sortFollowerIDs();
	await sortMarkets();
	startStream(followerIDs);
	setInterval(() => {
		sortMarkets();
	}, 300000); // 5 min updates
	// await slack.postToSignalsChannel('Test message from APE Bot to signals channel.')
}

init();

process.on('unhandledRejection', (reason, p) => {
	console.log('ERROR 110', reason);
});
