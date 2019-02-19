var request = require('request'); //HTTP-запити
var cheerio = require('cheerio'); //Парсинг
var TelegramBot = require('node-telegram-bot-api');//Telegram-bot
var fs=require('fs');//Робота з файлами

var token = '418440998:AAGpggVT2H3_4am1qZmwoNaQ5BEUS6-UEzg';//Токен
var url = 'https://ekotur.com.ua';//Сторінка, яка парситься
var file = 'data.json';//Назва файла

//admins - масив telegram id адмінів
//last_post - заголовок останнього поста на головній сторінці (для перевірки нявності оновлень)
//channel - канал, в який бот буде репостити
var data = {"admins": [310694905],"last_post":"", "channel":""}

loadFile();//читання з файла
setInterval(intervalFunction, 180000);// Перевірка наявності оновлень (900000 - 15 хв, 3600000 - 1 год) 


var bot = new TelegramBot(token, {polling: true});//створення бота


function getPost(i, callback)//отримати пост з головної сторінки
{
	request({uri:url, method:'GET', encoding:'utf-8'},//HTTP-запит (головна сторінка)
		function (err, res, page) 
		{
			let $=cheerio.load(page);//Завантаження сторінки для парсингу
			let content=$('div.two-third').eq(0);//Список постів
			let post_contents=content.children('.last');//Тексти постів

			let post_title=post_contents.eq(i).children('h2');//Заголовок конкретного поста
			let post_text=post_contents.eq(i).children('p');//Текст конкретного поста
			let msg="*"+post_title.text()+"*"+"\n"+post_text.text();//Текст повідомлення

			let post_link=post_title.children('a').attr('href');//Посилання на сторінку

			prepareMessage(msg, post_link, callback);//Виклик функції для отримання картинки
    	}
    );
}


function prepareMessage(msg, link, callback)//Функція для отримання картинки
{
	request({uri:link, method:'GET', encoding:'utf-8'},//HTTP-запит (сторінка поста)
		function(err, res, page)
		{
			let $=cheerio.load(page);//Завантаження сторінки для парсингу
			let post_pic=$('img').eq(1).attr('src');//Отримання першої картинки з поста

			if(!post_pic.startsWith(url))//Якщо адреса картинки відносна
				post_pic=url+post_pic;//Перетворюємо її на постійну
			
			msg+="\n[Детальніше]("+link+")[→]("+post_pic+")";//Додаємо до повідомлення посилання на пост та картинку			
			callback(null, msg);
		}
	);
}


bot.onText(/^\/get(.*|\n)*$/, function(msg, match) 
{ 
	let fromId = msg.from.id;//telegram id відправника
	let num = msg.text.substr(4);//Номер поста з головної сторінки
	getPost(num, function(err, msg){bot.sendMessage('@turbottest',msg,{parse_mode : "markdown"})});//Відправити пост          
});

function loadFile()//Завантажити дані з файлу
{	
	let text = fs.readFileSync(file);
	data=JSON.parse(text);
} 

function intervalFunction()//Функція для таймера
{
	request({uri:url, method:'GET', encoding:'utf-8'},//HTTP-запит (головна сторінка)
		function (err, res, page) 
		{
			let $=cheerio.load(page);//Завантаження сторінки для парсингу
			let content=$('div.two-third').eq(0);//Список постів
			let post_contents=content.children('.last');//Тексти постів
			let last_title=post_contents.eq(0).children('h2').text();//Заголовок останнього поста

			if(last_title != data.last_post)//Якщо збережений заголовок поста та завантажений заголовок поста не співпадають
			{
				data.last_post=last_title;
				fs.writeFileSync(file, JSON.stringify(data));//Зберігаємо заголовок нового поста
				/*for(let i = 0; i < data.admins.length; i++)//Відправляємо повідомлення
			    {
			    	getPost(0, function(err, msg){bot.sendMessage(data.admins[i],msg,{parse_mode : "markdown"})});              
			    }*/
			    //Відправляємо повідомлення в канал
			    getPost(0, function(err, msg){bot.sendMessage(data.channel,msg,{parse_mode : "markdown"})});
			}
		}
	);
}