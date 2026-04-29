import path from 'path';
import fs from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import Dotenv from 'dotenv-webpack';

const __dirname = path.resolve();

export default {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    new Dotenv(),
  ],
  devServer: {
    historyApiFallback: true,
    static: path.resolve(__dirname, 'public'),
    port: 3001,
    open: true,
    client: { overlay: false },
    proxy: [
      {
        context: ['/rpc'],
        target: 'http://127.0.0.1:8545',
        pathRewrite: { '^/rpc': '' },
        changeOrigin: true,
      },
    ],
    setupMiddlewares: (middlewares, devServer) => {
      const uploadsDir = path.resolve(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

      // POST /api/upload — reçoit { hash, data (base64), filename }
      devServer.app.post('/api/upload', (req, res) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { hash, data, filename } = JSON.parse(body);
            const base64 = data.replace(/^data:[^;]+;base64,/, '');
            const ext    = path.extname(filename || '.pdf') || '.pdf';
            const fname  = hash + ext;
            fs.writeFileSync(path.join(uploadsDir, fname), Buffer.from(base64, 'base64'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: `/api/files/${fname}` }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      // GET /api/files/:filename — sert le fichier avec le bon type MIME
      devServer.app.get('/api/files/:filename', (req, res) => {
        const filePath = path.join(uploadsDir, req.params.filename);
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const ext = path.extname(req.params.filename).toLowerCase();
        const mimeTypes = {
          '.pdf':  'application/pdf',
          '.doc':  'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        const mime = mimeTypes[ext] || 'application/octet-stream';
        const dlName = 'diplome' + ext;
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${dlName}"`);
        fs.createReadStream(filePath).pipe(res);
      });

      return middlewares;
    },
  },
};
