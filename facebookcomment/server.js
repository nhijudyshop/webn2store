app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));