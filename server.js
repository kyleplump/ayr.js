const express = require('express');
const path = require('path')

const app = express();
app.use('/src', express.static(__dirname + '/src'))
app.use(express.static(__dirname + '/'))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.listen(3000, () => console.log('server started'))
  