# Kentico Extensions

In a nutshell, Kentico Extensions extends the UI and functionality of Kentico using JavaScript.

**Note that Kentico Extensions was not developed by, nor has any affiliation with Kentico the company.**

The best way to understand Kentico Extensions is via examples:

## Environment Bar

Have you done something in one environment (Production) when you meant to do it in another (Development) ✋

The Environment Bar extensions adds a colored line and label to clearly identify between different environments.

![image](https://user-images.githubusercontent.com/6457851/164613903-7b0fe39e-3930-4dfc-ac8a-ad4c830e8fee.png)

The colours also help identify different environments within the task tray.

![image](https://user-images.githubusercontent.com/6457851/164613922-fa3c3100-b1ce-445a-995c-35a1760e811a.png)

## Shortcuts Bar

Tired of pressing F2, typing "custom tables" and hitting enter? ✋

The shortcuts bar adds your dashboard tiles to a navigation bar. By holding down Ctrl and clicking items, you can easily open applications in a new tab.

The shortcuts bar is based on the tiles on your dashboard.

![image](https://user-images.githubusercontent.com/6457851/164612800-a3b94aaf-5cbf-4836-a17c-0dfc38b0f2fb.png)

If the shortcuts bar is covering information in the header, it can easily be collapsed.

![image](https://user-images.githubusercontent.com/6457851/164614205-03161c55-9be4-434a-8f01-3e0ee485e9b0.png)

**These are just two examples, but Kentico Extensions can do much much more**

## Contributing

Create a local Environment file (`.env.local`) copied from the included production file (`.env`).

Example:

```ini
NODE_ENV=development
OUTFILE=../path/to/test/site/CMS/kenticoextensions/kenticoextensions.min.js
```
