
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
			pager: {
				back: "Back", forward: "Forward"
			},
			thread: {
				skippedcount: "{count, plural,\n one {One post has}\n other {# posts have}} been skipped."
			},
			post: {
				"delete": "Delete post",
				lock: "Lock thread",
				pin: "Pin thread",
				answers: "Answers:",
				deleted: "This post has been deleted.",
				deletedmod: "This post has been deleted by a moderator."
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
			pager: {
				back: "Назад", forward: "Вперед"
			},
			thread: {
				skippedcount: "{count, plural,\n one {Пропущен один пост}\n few {Пропущено # поста}\n many {Пропущено # постов}\n other {Пропущено # постов}}."
			},
			post: {
				"delete": "Удалить пост",
				lock: "Закрыть тред",
				pin: "Закрепить тред",
				answers: "Ответы:",
				deleted: "Пост удален.",
				deletedmod: "Пост удален модератором."
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
		}
	}
};
intlData.messages["ru-RU"] = intlData.messages.ru;