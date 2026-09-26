// Servidor PeerJS local para os testes do jogo online com o transporte de verdade (WebRTC).
const { PeerServer } = require('peer');

PeerServer({ port: 9000, host: '127.0.0.1', path: '/zb' });
console.log('PeerJS de teste em http://127.0.0.1:9000/zb');
