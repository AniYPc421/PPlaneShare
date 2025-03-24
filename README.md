# PPlaneShare

A WebRTC based file transferring web application.

## Usage

### From Scratch

Build frontend first:

``` bash
cd PPlaneShareFrontend
npm install
npm run build
```

Move generated files to backend:

``` bash
cd ..
mv PPlaneShareFrontend/dist/ PPlaneShareBackend/public/
```

Start backend:

``` bash
cd PPlaneShareBackend
npm install
npm start
```

### Docker

Build docker image:

``` bash
docker build -t planeshare .
```

Run docker container:

``` bash
docker run -p 42100:42100 planeshare
```

## License

MIT
