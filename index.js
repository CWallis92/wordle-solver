var inquirer = require("inquirer");

const isValidGuess = async (input) => {
  return /[a-z]{5}/i.test(input) || "Not a valid 5 letter word";
};

const startGameQuestions = [
  {
    type: "input",
    name: "guess",
    message: "Guess the word!",
    validate: isValidGuess,
  },
];

// Start the game
inquirer.prompt(startGameQuestions).then(({ guess }) => {
  console.log(`You guessed '${guess}'`);
});
