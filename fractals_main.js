const fs = require('fs');
const cheerio = require('cheerio');
const open = require('open');


// Open the new file in your default browser
update_fractals()
open('display_fractals.html');


//watch for changes in statevectors.txt and reload html page if true
fs.watch('statevectors.txt', (eventType, filename) => {
  if (eventType === 'change') {
    update_fractals();
  }
});

function reloadPage() {
  console.log('new statevector detected');
  const { exec } = require('child_process');
  const substring = '/display_fractals.html'
  exec(`osascript -e 'tell application "Google Chrome" to repeat with w in windows
  repeat with t in tabs of w
    if URL of t contains "${substring}" then reload t
  end repeat
end repeat'`);
  //exec('osascript -e \'tell application "Google Chrome" to tell the active tab of its first window to reload\'');
}





// Read the file content of the statevectors.txt
async function open_data() {
  // Define the file path
  const filePath = 'statevectors.txt';

  let statevectors;
  const promise = new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', function (err, data) {
      if (err) {
        // Error reading file
        console.error('Error reading file:', err);
      } else {
        statevectors = data
        resolve(data)
      }
    })
  })
  statevector = await promise
  return statevectors
}


//updates the fractals on the html based upon the statevector file
async function update_fractals() {
  const statevectors = await open_data()
  const parsedStatevectors = parseStatevectors(statevectors)


  // Read the HTML file
  const html = fs.readFileSync('fractals.html', 'utf8');
  // Load the HTML into a virtual DOM with Cheerio
  const $ = cheerio.load(html);


  let scriptContent = $('#statevectors').html(); // Get the content of the first script element

  // Modify the content of the script element
  scriptContent = 'const statevectors = ' + parsedStatevectors

  $('#statevectors').html(scriptContent); // Set the modified content back into the script element


  fs.writeFileSync('display_fractals.html', $.html());
  reloadPage();
}

//parses the statevectors from the text file and creates a string that can
//be injected into the html and run.
function parseStatevectors(statevectors) {
  statevectors = statevectors.split("\n").map(item => item.split(","));
  let parsedStatevectors = "[";
  for (let i = 0; i < statevectors.length; i++) {
    parsedStatevectors += "["
    for (let j = 0; j < statevectors[i].length - 1; j += 2) {
      parsedStatevectors += "math.complex(" + statevectors[i][j] + "," + statevectors[i][j + 1] + ")"
      if (j < statevectors[i].length - 2) { parsedStatevectors += "," }
    }
    parsedStatevectors += "],"
  }
  parsedStatevectors += "];"
  return parsedStatevectors
}


/**
 * mutlithreading
 */

/*
 const { Worker } = require('worker_threads');


 let array = [];
 for(let i = 0; i < 500000; i++){
  array.push([1,2,3,5,2,3,4,1,6,2,6,4,2,1])
  array.push([5,3,9,8,7,4,2,3,6,5,4,1,2,3])
  array.push([7,5,2,1,6,3,2,1,6,8,5,4,2,1])
  array.push([5,4,2,1,5,4,2,0,9,8,7,6,5,2])
 }

 console.time('Execution time');

 let result = [];
 for (let i = 0; i < array.length; i++) {
   for (let j = 0; j < array[i].length; j++) {
     if(array[i][j] % 2 == 0){
        array[i][j] = array[i][j] **2
     }else{
      array[i][j] = array[i][j]/2
     }
   }
 }
 console.timeEnd('Execution time');



 console.time('Execution time mt');

 const numWorkers = 8;
 const chunkSize = Math.ceil(array.length / numWorkers);
 
 //let result = 0;
 let workersFinished = 0;
 
 for (let i = 0; i < numWorkers; i++) {
   const startIndex = i * chunkSize;
   const endIndex = Math.min((i + 1) * chunkSize, array.length);
 
   const worker = new Worker('./worker.js');
 
   worker.on('message', (workerResult) => {
     result.push(workerResult);
     workersFinished++;
     if (workersFinished === numWorkers) {
       console.log('Result:', result);
       console.timeEnd('Execution time mt');
     }
   });
 

   worker.postMessage({ startIndex, endIndex, array });
 }
 */



