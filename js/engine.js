var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var width = canvas.width;
var height = canvas.height;
var rect = canvas.getBoundingClientRect();

var Game = {
	
	//Переменные игры
	Paused: true, //True когда игра приостановлена
	New: false, //True при перезапуске игры
	Direction: 1, //Directions: 1 : 'right', 2 : 'up', 3 : 'left', 4 : 'down'
	PreviousDirection: 1, //Предыдущее направление игры (для предотвращения ошибок)
	PreviousArrowDirection: 1, //Предыдущий выбор (для предотвращения ошибок)
	NextDirection: null, //Следующее заданное направление (default null)
	Score: 0, //Гол
	Snake: [], //Змеиный массив
	Food: {}, //Структура питания
	Bonus: {}, //Игровые бонусы
	Loop: 0, //Основной игровой цикл
	Fruits: [], //Игра бонусных фруктов (loaded in loader.js)
	PreviousScoreTime: new Date().getTime(), //Время последней оценки, не используется
	LocalStorage: localStorageCheck(), //Проверьте, включен ли браузер в localalstorage
	BorderActive: false, //Установить границу активным или нет
	
	//Методы игры
	Init: function(){
		Game.Direction = 1;
		Game.PreviousDirection = 1;
		Game.PreviousArrowDirection = 1;
		Game.Score = 0;
		Game.CreateFood();
		Game.CreateSnake();
		Game.Bonus = {};
		$('#score-num').text(Game.Score.toString());
	},
	
	Tick: function(){
		Game.Update();
		Game.Draw();
	},
	
	Draw: function(){
		Game.MoveSnake();
		Game.DrawSnake();
		Game.DrawFood();
		Game.DrawFruit();
	},
	
	Update: function(){
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	},
	
	Play: function(){
		if(Game.New){
			Game.Init();
		}
		$('#canvas-overlay').fadeOut('fast');
		$('#save').hide();
		Game.Loop = setInterval(Game.Tick, 1000/Settings.FPS);	
		Game.Paused = false;
		Game.New = false;
		$("#speed-fader").prop('disabled', true);
		$("#border-selector").prop('disabled', true);
	},
	
	Pause: function(){
		clearInterval(Game.Loop);
		$('#canvas-overlay').fadeIn('fast');
		$('#overlay-text').text('Paused');
		Game.Paused = true;
	},
	
	CreateSnake: function(){
		Game.Snake = [];
		for(var i = Settings.SnakeLenght - 1; i >= 0; i--) {
			Game.Snake.push({x: i + Settings.InitialPosition.x, y: Settings.InitialPosition.y});
		}
		Game.DrawSnake();
	},
	
	DrawSnake: function(){
		for(var i = 0; i < Game.Snake.length; i++){
			var c = Game.Snake[i];
			Game.DrawPoint(c.x, c.y);
		}
	},
	
	DrawFood: function(){
		Game.DrawCircle(Game.Food.x, Game.Food.y);	
	},
	
	CreateFood: function(){
		var cw = Settings.BlockSize;
		var correct = false;
				
		while(!correct){
			Game.Food = {
				x: Math.round(Math.random()*(width - cw)/cw), 
				y: Math.round(Math.random()*(height - cw)/cw), 
			};
			correct = true;
			for(var i = 0; i < Game.Snake.length; i++){
				var c = Game.Snake[i];
				if(c.x == Game.Food.x && c.y == Game.Food.y){
					correct = false;
				}
			}
		}
		
		Game.DrawCircle(Game.Food.x, Game.Food.y);
	},
	
	MoveSnake: function(){
		var cw = Settings.BlockSize;
		var headx = Game.Snake[0].x;
		var heady = Game.Snake[0].y;
		
		//Check if directionality change is too fast
		var useNextDirection = false;
		if((Game.PreviousDirection == 1 && Game.Direction == 3)
			|| (Game.PreviousDirection == 3 && Game.Direction == 1)
			|| (Game.PreviousDirection == 2 && Game.Direction == 4)
			|| (Game.PreviousDirection == 4 && Game.Direction == 2)){
			Game.NextDirection = Game.Direction;
			Game.Direction = Game.PreviousArrowDirection;
			useNextDirection = false;
		} else {
			useNextDirection = true;
		}
		
		//Если NextDirection сохраняется, используйте его
		if(Game.NextDirection != null && useNextDirection){
			Game.Direction = Game.NextDirection;
			Game.NextDirection = null;	
		}
		
		var d = Game.Direction;
		Game.PreviousDirection = d;
		
		//Directions: 1 : 'right', 2 : 'up', 3 : 'left', 4 : 'down'
		if(d == 1) headx++;
		else if(d == 3) headx--;
		else if(d == 2) heady--;
		else if(d == 4) heady++;
		
		
		if(Game.CheckSelfCollision(headx, heady)){
			Game.Lose();
			return;
		}
		
		if(Game.BorderActive){
			//Если граница активна, переместите змею на другую сторону
			if(headx == -1){
				headx = width/cw;
			} else if(headx >= width/cw){
				headx = 0;
			} else if(heady == -1){
				heady = height/cw;
			} else if(heady >= height/cw){
				heady = 0;
			}
		} else {
			//Границы не активны
			if(Game.CheckBorderCollision(headx, heady)){
				Game.Lose();
				return;
			}
		}
		
		//Создай хвост и поставь его на первое место Змеи
		if(headx == Game.Food.x && heady == Game.Food.y){
			var tail = {x: headx, y: heady};
			var value = Settings.ScoreValue;
			
			if(Game.BorderActive){
				value = Settings.ScoreValueBorder;
			}
			
			if(Settings.FPS < 10){
				value += Math.floor(Settings.FPS * 0.1);
			} else if(Settings.FPS >= 10 && Settings.FPS < 15){
				value += Math.floor(Settings.FPS * 0.3);
			} else if(Settings.FPS >= 15 && Settings.FPS < 20){
				value += Math.floor(Settings.FPS * 0.5);
			} else if(Settings.FPS == 20){
				value += Math.floor(Settings.FPS * 0.7);
			}
			Game.AddScore(value);
			//Создать новую еду
			Game.CreateFood();
			Game.AddBonus();
		} else if(headx == Game.Bonus.x && heady == Game.Bonus.y){
			Game.AddScore(Game.Bonus.value);
			Game.Bonus = {};
			var tail = Game.Snake.pop();
			tail.x = headx; 
			tail.y = heady;
		} else {
			var tail = Game.Snake.pop();
			tail.x = headx; 
			tail.y = heady;
		}
		
		//Отодвигает хвост как первую клетку
		Game.Snake.unshift(tail); 

	},
	
	//Проверьте столкновение на границе
	CheckBorderCollision: function (x, y) {
		var cw = Settings.BlockSize;
		if(x == -1 || x >= width/cw 
			|| y == -1 || y >= height/cw){
			//Проверяет столкновения Снейка на границе
			return true;
		}
		return false;
	},
	
	//Проверьте столкновение на самой змеи
	CheckSelfCollision: function (x, y) {
		for(var i = 0; i < Game.Snake.length; i++){
			if(Game.Snake[i].x == x && Game.Snake[i].y == y)
			 return true;
		}
		return false;
	},
	
	DrawPoint: function(x, y) {
		var cw = Settings.BlockSize;
		ctx.fillStyle = Settings.BlockColor;
		ctx.shadowBlur = 5;
		ctx.shadowOffsetX = 3;  
		ctx.shadowOffsetY = 3;  
		ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
		ctx.roundRect(x * cw, y * cw, cw - 1, cw - 1, 3).fill();
	},
	
	DrawCircle: function(x, y){
		var cw = Settings.BlockSize;
		ctx.fillStyle = Settings.FoodColor;
		ctx.beginPath();
		ctx.arc(x * cw + Settings.BlockSize/2, y * cw + Settings.BlockSize/2, Settings.BlockSize/2, 0, 2 * Math.PI);
		ctx.fill();
	},
	
	AddScore: function(value){
		Game.Score += value;
		$('#score-num').text(Game.Score.toString());	
		var msg = $('<div></div>')
			.addClass('bonus-text')
			.text('+' + value)
			.show();
		$('#game-container').append(msg);
		setTimeout(function() {
			msg.addClass('big').fadeOut(500, function(){
				$(this).removeClass('big');
			});
		}, 100);
		
	},
	
	Lose: function(){
		clearInterval(Game.Loop);
		$('#canvas-overlay').fadeIn('fast');
		$('#overlay-text').html('Try Again!<br><span class="small">Press ENTER to restart</span>');
		Game.Paused = true;
		Game.New = true;
		$("#speed-fader").prop('disabled', false);
		$("#border-selector").prop('disabled', false);
		$('#save').show();
	},
	
	AddBonus: function(){
		var percent = Math.random();
		if(percent > Settings.FruitPercentage && !Game.Bonus.active){
			//Добавление бонуса		
			var cw = Settings.BlockSize;
			var correct = false;
					
			while(!correct){
				Game.Bonus = {
					x: Math.round(Math.random()*(width - cw)/cw), 
					y: Math.round(Math.random()*(height - cw)/cw),
					active: true 
				};
				correct = true;
				for(var i = 0; i < Game.Snake.length; i++){
					var c = Game.Snake[i];
					if(c.x == Game.Bonus.x && c.y == Game.Bonus.y){
						correct = false;
					}
				}
			}
			
			var fruit = Game.Fruits[Math.floor(Math.random()*Game.Fruits.length)];
			Game.Bonus.img = fruit.img;
			Game.Bonus.value = fruit.value;
			Game.DrawFruit();
			setTimeout(function() { 
				//Удалить фрукты
				Game.Bonus = {};
			}, Settings.FruitDuration * 1000);
		}
		
	},
	
	DrawFruit: function(){
		if(Game.Bonus.active){
			var cw = Settings.BlockSize;
			ctx.drawImage(Game.Bonus.img, Game.Bonus.x * cw - 5, Game.Bonus.y * cw - 5, 
				Settings.BlockSize + 10, Settings.BlockSize + 10);
		}
	},

	UpdateDimensions: function(w, h, dpi){
		width = w;
		height = h;
		canvas.width = w;
		canvas.height = h;
		setCanvasDPI(canvas, dpi);
	}
		

};

if($(window).width() > 500){
	console.log('Desktop version');  
	Game.UpdateDimensions(500, 360, 300);
} else {
	console.log('Mobile version');
	Game.UpdateDimensions(window.innerWidth - 20, 300, 150);
	Settings.BlockSize = 20;
}

Game.Init();

//Нажмите на кнопку воспроизведения
$(document).on('click', '#overlay-text', function(){
	Game.Play();
	addGameCount()
});

$(document).on('touchstart', '#overlay-text', function(){
	Game.Play();
	addGameCount()
});

$(document).on('click', '#save', function(){
	$('#save-score-box').fadeIn('fast');
});

$(document).on('touchstart', '#save', function(){
	$('#save-score-box').fadeIn('fast');
});

//Нажмите на кнопку сохранить
$(document).on('click', '#save-button', function(){
	saveScore();
});

$(document).on('touchstart', '#save-button', function(){
	saveScore();
});

function saveScore(){
	var score = Game.Score;
	var name = $('#save-name').val();
	var same = 'false';
	
	if(name.length > 0 && name != '' && score > 0){
		//Имя и оценка действительны
	
		if(Game.LocalStorage){
			//Проверьте, играл ли пользователь уже в localstorage
			if(localStorage.getItem("username") == name){
				//Тот же пользователь
				same = 'true';
				console.log('Same user, overwriting result');
			} else {
				//Новый пользователь	
				localStorage.setItem("username", name); 
				console.log('New user, insert score');
			}
		}
		
		//ajax call
		$.ajax({
				url: Settings.InsertScoreUrl + '?name=' + name +'&score=' + score + '&same=' + same,
				type: 'GET',
				dataType: 'html',
				crossDomain:true,
				success: function(data){
					console.log('Score added correctly!');
					loadRanking();
				}
			});
			

	}
	$('#save-score-box').fadeOut('fast');
	$('#save').fadeOut('fast');
}

$(document).on('click', '#cancel-button', function(){
	$('#save-score-box').fadeOut('fast');
});

$(document).on('touchstart', '#cancel-button', function(){
	$('#save-score-box').fadeOut('fast');
});


//Keydown events
$(document).on('keydown', function(e){
	var e = e || window.event;
	var c = e.keyCode;
	var d = Game.Direction;
	Game.PreviousArrowDirection = d;
	//Клавиши со стрелками
	//Directions: 1 : 'right', 2 : 'up', 3 : 'left', 4 : 'down'
	if((c == 37 || c == 100)&& d != 1) {
		//Стрелка влево	
		Game.Direction = 3; 
		if(Game.Paused && !Game.New){
			Game.Play();
		}
		return false;
	}
	else if((c == 38 || c == 104) && d != 4) { 
		//Стрелка вверх
		Game.Direction = 2; 
		if(Game.Paused && !Game.New){
			Game.Play();
		}
		return false;
	}
	else if((c == 39 || c == 102) && d != 3) { 
		//Правая стрелка
		Game.Direction = 1; 
		if(Game.Paused && !Game.New){
			Game.Play();
		}
		return false;
	}
	else if((c == 40 || c == 101) && d != 2) { 
		//Стрелка вниз
		Game.Direction = 4; 
		if(Game.Paused && !Game.New){
			Game.Play();
		}
		return false;
	}
	else if(c == 13) {
		//Press Enter
		if(Game.Paused){
			Game.Play();
		}
	} else if(c == 27 || c == 80){
		//Press Esc or 'p'
		if(!Game.Paused){
			Game.Pause();	
		}
	}
});

//Размах событий
$(document).ready(function(){
	$('#canvas-container').swipe( {       
        swipe:function(event, direction, distance, duration, fingerCount) {
			//Directions: 1 : 'right', 2 : 'up', 3 : 'left', 4 : 'down'
			var d = Game.Direction;
			if(direction == 'left' && d != 1) {
				//Стрелка влево	
				Game.Direction = 3; 
					return false;
				}
				else if(direction == 'up' && d != 4) { 
					//Стрелка вверх
					Game.Direction = 2; 
					return false;
				}
				else if(direction == 'right' && d != 3) { 
					//Правая стрелка
					Game.Direction = 1; 
					return false;
				}
				else if(direction == 'down' && d != 2) { 
					//Стрелка вниз
					Game.Direction = 4; 
					return false;
				}
        },
        threshold:20
      });
});