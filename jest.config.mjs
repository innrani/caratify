export default {
    testEnvironment: 'node', // Definindo o ambiente de teste
    transform: {
      '^.+\\.mjs$': 'babel-jest', // Se você estiver usando Babel, adicione essa linha
    },
    moduleFileExtensions: ['js', 'mjs', 'json', 'node'], // Adicionando extensões que o Jest deve reconhecer
  };
  