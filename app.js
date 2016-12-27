var sqlite3 = require('sqlite3').verbose();
var exp = require('express');
var app = exp();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var db = new sqlite3.cached.Database('esv.sqlite3', sqlite3.OPEN_READONLY);

function getChapVerse(chap,verse){
	// Convert chapter/verse to REAL
	var chap_verse = chap + ".";
	var v = verse;
	var spaces = 3 - verse.length;
	for(var i=0; i < spaces; i++){
		v = '0' + v;
	}
	chap_verse += v;
	return parseFloat(chap_verse);
}


app.get('/', function(req,res){
	res.write('<html><body>');
	res.write('<form method="post" action="/lookup">');
	res.write('Book <input type="text" name="book"><br>');
	res.write('Chapter <input type="text" name="chapter"><br>');
	res.write('Verse <input type="text" name="verse"><br>');
	res.write('<button type="submit">Go</button>');
	res.write('</form>');
	res.write('</body></html>');
	res.end();
});

app.get('/lookup', function(req,res){

	// **SAMPLE BIBLE VERSE**
	book = 'Rom';
	chapter = '5';
	verse = '8';	

	res.write("<h1>" + book + " " + chapter + ":" + verse + "</h1><br>")
	// Search database & get bible verse
	var bibleText = '';
	var chapverse = getChapVerse(chapter, verse);
	console.log("chapverse: " + chapverse);
	var stmt = db.prepare('SELECT * FROM verses WHERE book = $book AND verse = $chapverse;', {
		$book: book,
		$chapverse: chapverse
	});
	stmt.get([], function(err,row){
		bibleText = row.unformatted;
		res.end(bibleText);
	});
});

app.post('/lookup', function(req,res){
	var book, chapter, verse;
	book = req.body.book,
	chapter = req.body.chapter,
	verse = req.body.verse;

	// Search database & get bible verse
	var bibleText = '';
	var chapverse = getChapVerse(chapter, verse);
	console.log("chapverse: " + chapverse);
	var stmt = db.prepare('SELECT * FROM verses WHERE book = $book AND verse = $chapverse;', {
		$book: book,
		$chapverse: chapverse
	});
	stmt.get([], function(err,row){
		bibleText = row.unformatted;

		console.log('BibleText: ' + bibleText);
		res.end(bibleText);
	});
});

app.listen(8000, function(){
	console.log('App listening on port 8000');
});
