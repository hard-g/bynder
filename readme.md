# Bynder WordPress Plugin

The Bynder WordPress plugin was built as a Gutenberg Block, that allows to add assets from Bynder to WordPress using the Compact View.

# Current status

The latest version of this plugin is **4.1.1** and requires at least **WordPress 5.0** and it was tested using **WordPress 5.3**.

## Implemented features

- Bynder Asset Block
  - Allows users to add an asset (document, image, video) from their Bynder account to their WordPress pages and posts.
- Bynder Gallery Block
  - Allows users to create a gallery with images from their Bynder account on their WordPress pages and posts.
- Asset tracking
  - Cron job that syncs (once per hour) the Bynder assets used in WordPress back to Bynder. This allows users to keep track of those assets through their Bynder portal.

# How does it work

This project was bootstrapped with [Create Guten Block](https://github.com/ahmadawais/create-guten-block).

Below you will find some information on how to run scripts.

> You can find the most recent version of this guide [here](https://github.com/ahmadawais/create-guten-block).

## 👉 `npm start`

- Use to compile and run the block in development mode.
- Watches for any changes and reports back any errors in your code.

## 👉 `npm run build`

- Use to build production code for your block inside `dist` folder.
- Runs once and reports back the gzip file sizes of the produced code.

## 👉 `npm run eject`

- Use to eject your plugin out of `create-guten-block`.
- Provides all the configurations so you can customize the project as you want.
- It's a one-way street, `eject` and you have to maintain everything yourself.
- You don't normally have to `eject` a project because by ejecting you lose the connection with `create-guten-block` and from there onwards you have to update and maintain all the dependencies on your own.

---
