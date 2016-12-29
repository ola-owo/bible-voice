var sqlite3 = require('sqlite3').verbose();
var exp = require('express');
var path = require('path');
var app = exp();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var db = new sqlite3.Database('esv.sqlite3', sqlite3.OPEN_READONLY);
db.on('trace', function(sql){console.log(sql)});
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

function dbSearch(book,chapter,verse,res,outputFunc){
  // Prepares DB search statement
  var bibleText = '';
  var chapverse = getChapVerse(chapter, verse);
  console.log("chapverse: " + chapverse);
  var stmt = db.prepare(
    'SELECT * FROM verses WHERE book = $book AND verse = $chapverse COLLATE NOCASE;', {
    $book: book,
    $chapverse: chapverse
  });

  console.log(stmt);
  stmt.get([],function(err,row){
    if(err){ // DB search error
      console.log('Verse not found!');
      res.status(404).send('Error: Verse search failed.');
      res.end()
    }else{
      if(!row){ // DB returns no results
        res.status(404).send('Error: Verse not found.');
        res.end();
      }else{
        outputFunc(res,row,book,chapter,verse);
      }
    }
  });
}


/*
  INDEX PAGE
*/
function output_index(res,row,book,chapter,verse){
  var bibleText = row.unformatted;
  res.write("<h1>" + book + " " + chapter + ":" + verse + "</h1><br>")
  res.write("<p>"+bibleText+"</p>");
  res.write('<a href="/">Go back</a>');
  res.end();
}

app.get('/', function(req,res){
  res.type('html');
  res.sendFile(path.join(__dirname+'/index.html'));
});

app.post('/', function(req,res){
  res.type('html');
  var book, chapter, verse;
  book = req.body.book,
  chapter = req.body.chapter,
  verse = req.body.verse;

  // Search database & get bible verse
  dbSearch(book,chapter,verse,res,output_index);
});

/*
  LOOKUP PAGE
*/
function output_lookup(res,row,book,chapter,verse){
  var output = {};
  bibleText = row.unformatted;
  console.log('BibleText: ' + bibleText);

  output.speech = bibleText;
  output.displayText = book + ' ' + chapter + ':' + verse + '\n' + bibleText;
  output.source = 'English Standard Version';
  res.send(JSON.stringify(output));
  res.end();
}

app.get('/lookup', function(req,res){
  res.type('html');
  book = 'Rom';
  chapter = '5';
  verse = '8';  

  // Search database & display bible verse
  dbSearch(book,chapter,verse,res,output_index);
});

app.post('/lookup', function(req,res){
  // For the API.ai program
  res.type('json');  
  console.log('result: ' + JSON.stringify(req.body.result));
  if(req.body.result.action === 'num_chapters'){ // count # chapters in book
    var book_abbr = req.body.result.parameters.book;

    var num_chapters, book;
    console.log('book_abbr: '+book_abbr);

    var stmt = db.prepare(
      'SELECT * FROM num_chapters WHERE book_abbr = ? COLLATE NOCASE',
      book_abbr
    );

    stmt.get([],function(err,row){
      if(err){ // DB search error
        console.log('Not found!');
        res.status(404).send('Error: Search failed.');
        res.end()
      }else{
        console.log('row: '+row);
        if(!row){ // DB returns no results
          console.log('no DB results for num_chapters');
          res.status(404).send('Error: Not found.');
          res.end();
        }else{
          var output = {};
          num_chapters = row.chapters;
          book = row.book;

          if(num_chapters === 1){
            output.speech = output.displayText = book + ' has one chapter.';
          }else{
            output.speech = output.displayText = book + ' has ' +
              String(num_chapters) + ' chapters.';
          }
          output.source = 'Wikipedia';
          res.send(JSON.stringify(output));
          res.end();
        }
      }
    });

  }else{ // if(req.body.result.action === 'read'){ // read single verse
    var book = req.body.result.parameters.book,
        chapter = req.body.result.parameters.chapter,
        verse = req.body.result.parameters.verse;

    dbSearch(book,chapter,verse,res,output_lookup);
  }
});

// Setup server on Heroku-provided port or 8000
var port = process.env.PORT || 8000;
app.listen(port, function(){
  console.log('App.js listening on port ' + port);
});
