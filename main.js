'use strict';

{
   /******************************
    *  画面表示を受け持つクラス
    *****************************/
   class Screen {
      constructor() {
         this.heading = document.getElementById('heading');
         this.title = document.getElementById('title');
         this.questionInfo = document.getElementById('questionInfo');
         this.content = document.getElementById('content');
         this.answerButtons = document.getElementById('answerButtons');
      }

      // クイズ取得中にメッセージを表示する
      printWaitingMessage() {
         this.title.textContent = '取得中';
         this.content.textContent = '少々お待ちください';
         document.getElementById('startButton').remove();
      }

      // クイズの表示
      printQuestion(question) {
         this.clearElements();

         // 問題番号は、最上部に表示しているtitle要素に上書きして表示する
         this.title.textContent = `問題${question.number}`;

         // 問題の[ジャンル]と[難易度]の要素を問題毎に作り直す
         const category = document.createElement('h2');
         category.textContent = `[ジャンル] ${question.category}`;
         this.questionInfo.appendChild(category);

         const difficulty = document.createElement('h2');
         difficulty.textContent = `[難易度] ${question.difficulty}`;
         this.questionInfo.appendChild(difficulty);

         // 問題文に特殊文字の使用があるためinnerHTMLを使用して表示する
         this.content.innerHTML = question.content;
      }

      // 答えのボタンを表示
      printAnser(answer) {
         const answerButton = document.createElement('button');
         // 回答に特殊文字の使用があるためinnerHTMLを使用して表示する
         answerButton.innerHTML = answer;
         // 答え合わせの際に使用する回答を格納する
         answerButton.value = answer;

         this.answerButtons.appendChild(answerButton);
      }

      // 正答数を表示してクイズを終了する
      printFinishedMessage(usersCorrectAnswer) {
         this.clearElements();

         this.title.textContent = `あなたの正答数は${usersCorrectAnswer}です！！`;
         this.content.textContent = '再度チャレンジしたい場合は以下をクリック！！';

         const homeButton = document.createElement('button');
         homeButton.textContent = 'ホームへ戻る';
         document.getElementById('movePageButton').appendChild(homeButton);
      }

      // 1つ前に出題したクイズの、不必要な要素を削除する
      clearElements() {
         // 問題の[ジャンル]と[難易度]を削除
         while(this.questionInfo.firstChild) {
            this.questionInfo.removeChild(this.questionInfo.firstChild);
         }
         // 答えのボタンをすべて削除
         while(this.answerButtons.firstChild) {
            this.answerButtons.removeChild(this.answerButtons.firstChild);
         }
      }
   }

   /*********************************************
    *  クイズの出題と正答数をカウントするクラス
    ********************************************/
   class Questioner {
      constructor() {
         this.screen = new Screen();
         this.questions = [];
         this.numberOfCorrectAnswers = 0;
      }

      // クイズの取得
      getQuestions() {
         return new Promise((resolve) => {
            const response = fetch('https://opentdb.com/api.php?amount=10');
            // クイズの取得に時間がかかる旨を表示する
            this.screen.printWaitingMessage();
            resolve(response);
         });
      }

      // クイズを他のメソッドでも使用するため、自身が持つ配列に格納する
      setQuestions(results) {
         this.questions = [...results];
      }

      sendQuestionToScreen(number) {
        // クイズの[カテゴリ]と[難易度]、問題文を取得する
        const category = this.questions[number].category;
        const difficulty = this.questions[number].difficulty;
        const content = this.questions[number].question;

        // 出題番号として使用するために引数の配列番号に1を足す
        number++;

        this.screen.printQuestion({number, category, difficulty, content});
      }

      sendAnswersToScreen(number) {
         // 表示する答えの並び順をランダムにするために、答えを配列に入れ直す
         const answers = [...this.questions[number].incorrect_answers];
         answers.push(this.questions[number].correct_answer);
         
         // 乱数で作成した番号を持つ答えを、1つずつ取り出して表示する
         for(let i = answers.length; i >  0; i--) {
            const answer = answers.splice(Math.floor(Math.random() * i), 1);
            this.screen.printAnser(answer);
         }
      }

      checkAnswer(userAnswer, number) {
         // 答え合わせをして合っていたら正答数を1増やす
         if(this.questions[number].correct_answer === userAnswer) this.numberOfCorrectAnswers++;
      }

      // クイズの終了時に表示するために正答数をスクリーンクラスに渡す
      sendNumberOfCorrectAnswers() {
         this.screen.printFinishedMessage(this.numberOfCorrectAnswers);
      }
   }

   /*****************************************
    *  クイズアプリの進行役を務めるクラス
    ****************************************/
   class Facilitator {
      constructor() {
         this.questioner = new Questioner();
         // 現在の出題番号
         this.currentNumber = 0;
         // 最終問題であるか確認するための変数
         this.lastNumber = 0;

         // トップページの「開始」ボタンを押した時の処理
         document.getElementById('startButton').addEventListener('click', () => {
            this.prepareQuestion();
         });

         // クイズの答えのいずれかのボタンを押した時の処理
         document.getElementById('answerButtons').addEventListener('click', e => {
            // ユーザーの入力した値と、現在の問題番号を渡して正答か確認する
            this.questioner.checkAnswer(e.target.value, this.currentNumber);

            // ここまでの処理で1問のクイズが終了となるため、
            // 次のクイズの処理へ進む前にクイズが最終問題であったか確認する
            this.checkFinished();
         });
      }

      // クイズを開始するための準備を開始する
      prepareQuestion() {
         const response = this.questioner.getQuestions();
         response
            .then(response => {
               if(response.ok) {
                  return response.json();
               } else {
                  throw new Error('エラーが発生しました');
               } 
            })
            .then(data => {
               // 取得したクイズを出題者に渡す
               this.questioner.setQuestions(data.results); 
               // 最後の問題番号を配列番号と合わせるため、問題数から1引く
               this.lastNumber = data.results.length - 1;

               // ここまでの処理で出題の準備が完了したため、1問目のクイズ出題の処理に進む
               this.sendQuestionNumber();
            })
            .catch(error => {
               console.log(error);
            })
      }

      // 現在の問題番号を渡してクイズと答えを作成する
      sendQuestionNumber() {
         this.questioner.sendQuestionToScreen(this.currentNumber);
         this.questioner.sendAnswersToScreen(this.currentNumber);
      }

      checkFinished() {
         // 現在の問題番号を1進める
         this.currentNumber++;

         // 最終問題が終わっていたら終了画面の処理に進む
         if(this.currentNumber > this.lastNumber) {
            this.questioner.sendNumberOfCorrectAnswers();
         // 次の問題の処理へ進む
         } else {
            this.sendQuestionNumber();
         }
      }
   }

   new Facilitator();
}