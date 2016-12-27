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
  res.write('<form method="post" action="/">');
  res.write('Book <input type="text" name="book"><br>');
  res.write('Chapter <input type="text" name="chapter"><br>');
  res.write('Verse <input type="text" name="verse"><br>');
  res.write('<button type="submit">Go</button>');
  res.write('</form>');
  res.write('</body></html>');
  res.end();
});

app.post('/', function(req,res){
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
  var stmt = db.prepare(
    'SELECT * FROM verses WHERE book = $book AND verse = $chapverse COLLATE NOCASE;', {
    $book: book,
    $chapverse: chapverse
  });
  stmt.get([], function(err,row){
    bibleText = row.unformatted;
    res.end(bibleText);
  });
});

app.post('/lookup', function(req,res){
  // For the API.ai program
  
  res.type('json');  

  var book = req.body.result.parameters.book,
      chapter = req.body.result.parameters.chapter,
      verse = req.body.result.parameters.verse;

  var output = {};

  // Search database & get bible verse
  var bibleText = '';
  var chapverse = getChapVerse(chapter, verse);
  console.log("chapverse: " + chapverse);
  var stmt = db.prepare(
    'SELECT * FROM verses WHERE book = $book AND verse = $chapverse COLLATE NOCASE;', {
    $book: book,
    $chapverse: chapverse
  });
  stmt.get([], function(err,row){
    if(err != null){
      console.log('Verse not found!');
      res.status(404).send('not found');
    }else{
      if(!row || row == undefined){
        res.status(404).send('not found!');
        res.end();
      }else{
        bibleText = row.unformatted;
        console.log('BibleText: ' + bibleText);

        output.speech = bibleText;
        output.displayText = book + ' ' + chapter + ':' + verse + '\n' + bibleText;
        output.source = 'English Standard Version';
        res.send(JSON.stringify(output));
      }
    }
  });
});

var port = process.env.PORT || 8000;
app.listen(port, function(){
  console.log('App.js listening on port ' + port);
});
