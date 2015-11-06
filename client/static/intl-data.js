
var intlData = {
	locales: ["en-US", "ru-RU", "ru"],
	messages: {
		"en-US": {
			navbar: {
				key: "Key",
				submit: "Enter"
			},
			navbreadcrumbs: {
				main: "Main",
				thread: "Thread No.{thread}"
			},
			mainpage: {
				newthreads: "Recent threads",
				mostansweredthreads: "Popular threads",
			},
			pager: {
				back: "Back", forward: "Forward"
			},
			thread: {
				skippedcount: "{count, plural,\n one {One post has}\n other {# posts have}} been skipped.",
				open: "Open thread"
			},
			post: {
				"delete": "Delete post",
				lock: "Lock thread",
				pin: "Pin thread",
				answers: "Answers:",
				deleted: "This post has been deleted.",
				deletedmod: "This post has been deleted by a moderator.",
				reply: "Reply to this post"
			},
			postingform: {
				topic: "Topic",
				contents: "Message",
				file: "Attachment",
				captcha: "Captcha",
				solution: "Solution",
				submit: {
					thread: "Submit answer",
					board: "Create thread"
				}
			},
			gallery: {
				gallerymode: "Gallery mode",
			},
			config: {
				sitename: "Govnaba",
				mainpagetitle: "Govnaba",
				mainpagesubtitle: 'Govnaba is a new imageboard engine focused on preserving traditions while embracing new web technologies.'
			},
			fatal: {
				header: "A fatal error occured",
				websocket: "Your browser doesn't support Websockets. Please throw it into the nearest trash bin.",
				connection: "The server could not be reached. Please try again later."
			},
		},
		"ru": {
			navbar: {
				key: "Ключ",
				submit: "Вход"
			},
			navbreadcrumbs: {
				main: "Главная",
				thread: "Тред №{thread}"
			},
			mainpage: {
				newthreads: "Новые треды",
				mostansweredthreads: "Популярные треды",
			},
			pager: {
				back: "Назад", forward: "Вперед"
			},
			thread: {
				skippedcount: "{count, plural,\n one {Пропущен один пост}\n few {Пропущено # поста}\n many {Пропущено # постов}\n other {Пропущено # постов}}.",
				open: "Открыть тред"
			},
			post: {
				"delete": "Удалить пост",
				lock: "Закрыть тред",
				pin: "Закрепить тред",
				answers: "Ответы:",
				deleted: "Пост удален.",
				deletedmod: "Пост удален модератором.",
				reply: "Ответить на пост"
			},
			postingform: {
				topic: "Тема",
				contents: "Текст",
				file: "Файл",
				captcha: "Капча",
				solution: "Ответ",
				submit: {
					thread: "Ответить в тред",
					board: "Создать тред"
				}
			},
			gallery: {
				gallerymode: "Режим галереи",
			},
			config: {
				sitename: "Govnaba",
				mainpagetitle: "Govnaba",
				mainpagesubtitle: 'Govnaba - новый движок имиджборд, старающийся сохранить их традиции, в то же время используя новые Web-технологии.'
			},
			fatal: {
				header: "Произошла неисправимая ошибка",
				websocket: "Ваш браузер не поддерживает технологию Websockets. Выкиньте его на помойку.",
				connection: "Не удалось установить соединение с сервером. Повторите попытку через несколько минут."
			},
		}
	}
};
intlData.messages["ru-RU"] = intlData.messages.ru;