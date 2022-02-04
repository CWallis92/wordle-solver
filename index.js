#!/usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import puppeteer from "puppeteer";

import makeGuess, { isValidGuess, getValidAnswers } from "./guess.js";

const startGameQuestion = [
  {
    type: "input",
    name: "guess",
    message: "Guess the word!",
    validate: isValidGuess,
  },
];

const continueGameQuestion = [
  {
    type: "input",
    name: "guess",
    message: "Have another go:",
    validate: isValidGuess,
  },
];

// Start the game
const play = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.powerlanguage.co.uk/wordle/", {
      waitUntil: ["networkidle0", "load"],
    });

    const closeIcon = await page.evaluateHandle(`
    document
    .querySelector("body > game-app")
        .shadowRoot.querySelector("#game > game-modal")
        .shadowRoot.querySelector("div > div > div > game-icon")
    `);
    if (closeIcon) await closeIcon.click();

    await page.waitForTimeout(1000);

    let guessCount = 0;
    let outputs = [];

    while (
      guessCount < 6 &&
      (outputs.length === 0 || !outputs.every((res) => res === "correct"))
    ) {
      const { guess } =
        guessCount === 0
          ? await inquirer.prompt(startGameQuestion)
          : await inquirer.prompt(continueGameQuestion);

      outputs = await makeGuess(page, guess, guessCount);

      const response = guess
        .split("")
        .map((letter, index) => {
          switch (outputs[index]) {
            case "present":
              return chalk.bgYellow(letter);
            case "correct":
              return chalk.bgGreen(letter);
            default:
              return chalk.bgGray(letter);
          }
        })
        .join("");

      console.log(response);

      const suggestions = getValidAnswers(guess, outputs);

      console.log("Valid answers remaining:", suggestions.length);
      console.log("Some possible answers:");
      let i = 0;
      while (i < 25 && i < suggestions.length) {
        console.log(suggestions[i]);
        i++;
      }

      guessCount++;
    }

    if (outputs.every((res) => res === "correct")) {
      console.log(
        `You won in ${guessCount} guess${guessCount === 1 ? "" : "es"}!`
      );
    } else {
      console.log("Better luck next time!");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
};

play();
