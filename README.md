# duplicate-finder/README.md

# Duplicate Finder Application

This project is a Duplicate Finder application designed to help users identify and manage duplicate files on their systems. 

## Features

- Scans specified directories for duplicate files.
- Provides a user-friendly interface for managing duplicates.
- Supports multiple languages.
- Offers various themes for customization.

## Project Structure

```
duplicate-finder
├── src
│   ├── index.html                # Main page of the application
│   ├── css                       # CSS styles
│   │   ├── style.css             # Main styles
│   │   └── themes                # Various themes (optional)
│   │       └── dark-theme.css    # Dark theme
│   ├── js                        # JavaScript files
│   │   ├── app.js                # Application initialization and settings
│   │   ├── ui-controller.js      # User interface management and interactions
│   │   ├── scanner.js            # Main scanning engine
│   │   ├── hash-worker.js        # Hash computation worker
│   │   ├── file-utils.js         # Helper functions for file handling
│   │   ├── image-utils.js        # Helper functions for image handling
│   │   └── statistics.js         # Statistical analysis and visualization
│   ├── lib                       # External libraries (if needed)
│   │   └── charts                # Visualization libraries (optional)
│   └── resources                 # Additional resources
│       ├── icons                 # Icons
│       └── locales               # Language files (if you want to support multiple languages)
│           ├── he.json           # Hebrew
│           └── en.json           # English
├── package.json                  # Project configuration file
└── README.md                     # Documentation for the project
```

## Installation

1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies using `npm install`.

## Usage

1. Open `index.html` in a web browser.
2. Follow the on-screen instructions to scan for duplicates.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes. 

## License

This project is licensed under the MIT License.

# מוצא הקבצים הכפולים

כלי פשוט ויעיל למציאת קבצים כפולים במחשב שלך. עובד ישירות בדפדפן, ללא צורך בהתקנה!

## תכונות עיקריות

- 🔍 מציאת קבצים כפולים לפי שם ותוכן
- 📊 הצגת סטטיסטיקות מפורטות
- 📁 תמיכה בתיקיות גדולות
- 🔒 עובד לוקאלית בדפדפן - הקבצים שלך נשארים במחשב שלך
- 🎯 ממשק משתמש פשוט ונוח

## איך להשתמש?

1. פתח את [הקישור לאפליקציה](https://talktome8.github.io/duplicate-finder/)
2. לחץ על כפתור "בחר תיקייה"
3. בחר את התיקייה שברצונך לסרוק
4. המתן לסיום הסריקה
5. בחן את התוצאות וטפל בקבצים הכפולים

## טיפים

- ניתן למיין את התוצאות לפי גודל, שם או מספר עותקים
- לחיצה על "העתק נתיב" תעתיק את מיקום הקובץ ללוח
- ניתן לעצור את הסריקה בכל שלב
- התוצאות מראות גם את גודל הקבצים הכפולים

## פיתוח

המערכת פותחה באמצעות:
- JavaScript
- HTML5
- CSS3
- File System Access API

## רישיון

MIT License - ניתן להשתמש, לשנות ולהפיץ בחופשיות

## קישורים

- [דף הפרויקט ב-GitHub](https://github.com/talktome8/duplicate-finder)
- [דווח על באג](https://github.com/talktome8/duplicate-finder/issues)