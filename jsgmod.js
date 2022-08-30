/*========================================================================================
 □■ jsgmod.js (JavaScript Game MODule) ■□
 
 フレーム管理やキー入力等を支援するモジュールです。
==========================================================================================
/*----------------------------------------------------------------------------------------
 ☆★ 定数一覧 ★☆
----------------------------------------------------------------------------------------*/
var FPS = 30;            // Frames Per Second; 1 秒間のフレーム数
var LOOP_INTERVAL = 17;  // <ミリ秒> メインループ起動間隔。(1000 / <FPS>) より小さくする
var KEY_CHARGE_DURATION = 7;  // <フレーム> キーリピート開始までのフレーム数
var KEY_REPEAT_SPAN = 2;      // <フレーム> 次のキーリピートまでのフレーム数
/*
● キーリピート
 キーを押し続けるとキーが連続で入力されることを「キーリピート」といいます。たとえば
 KEY_CHARGE_DURATION = 20, KEY_REPEAT_SPAN = 4 とすれば、キーを押し始めたフレームと、そこ
 から数えて 20, 24, 28, 32, … フレームの間押し続けたときに入力を送る( IsInputting が true
 を返す)ようになります。
*/
/*----------------------------------------------------------------------------------------
 ☆★ 使い方 ★☆

 Javascript でフレーム制御を行うモジュールです。本モジュールの読み込み元に Setup() (起動時
 の 1 回だけ処理される初期化処理)と Main() (毎フレーム実行される処理)を定義してください。
 また、body タグの onLoad イベントから Execute() を呼び出してください。

◎ HTML ファイルのソースの例
 <html>
  <head>
   <script type="text/javascript" src="jsgmod.js"></script>
   <script type="text/javascript" src="my_sccript.js"></script>
  </head>
  <body onLoad="Execute()">
   本文
  </body>
 </html>

------------------------------------------------------------------------------------------
● キー制御
 PressedDuration(keyName)         キーが何フレーム押されているか
 IsPressed(keyName)               キーは入力開始状態?
 IsHolded(keyName)                キーが押されている?
 IsInputting(keyName)             キーは入力を与えている?

● スクリプト作成・デバッグ
 p(value, variableName)             コンソールに表示
 InitArg(variable, defaultValue)    定義済の値かデフォルト値を取得

● 表示
 Say(textBoxName, text)           テキストの表示
 SetImage(imageId, src)           画像の表示

● 時間
 EHour()                          経過時間の「時間」を取得
 EMin()                           経過時間の「分」を取得
 ESec()                           経過時間の「秒」を取得
 EMSec()                          経過時間の「ミリ秒」を取得
 ETime()                          経過時間をを秒数で取得
 EtStr(hLength=2, hDelim=':', mDelim=':', sDelim='', msLength=0)
                                  経過時間を文字列に変換して取得

● 数値処理
 Round(n, place=0)                小数点の指定位で四捨五入
 Floor(n, place=0)                小数点の指定位で切り捨て
 Ceil(n, place=0)                 小数点の指定位で切り上げ
 Justify(n)                       丸め誤差の修正
 Rand(n=0, times=0)               乱数の生成

● クッキー
 Save(name, value, expireDays)    クッキーへセーブ
 Load(name)                       クッキーからロード

● 起動
 Execute()                        起動( body タグの onLoad イベントから呼び出してください)

● オブジェクト
 Layer                            レイヤー
   Show()                           表示
   Hide()                           隠す
   MoveTo(x, y)                     指定位置に移動
   MoveBy(dX, dY)                   指定量だけ移動
   ResizeTo(width, height)          サイズ変更
   ResizeBy(dWidth, dHeight)        相対値を指定してサイズ変更
   Write(text, overwrites=true)     テキスト( HTML ソース)の記入

========================================================================================*/
/*----------------------------------------------------------------------------------------
 ☆★ グローバル変数一覧 ★☆

 便宜上全公開変数となっていますが、このモジュール外からは値を変更しないでください。
----------------------------------------------------------------------------------------*/
var gTimer;         // メインループの制御用タイマー
var gStartTime;     // 開始時刻
var gFrames;        // 経過フレーム数
var gInputs;        // [～255] 各キーを押し続けているフレーム数
var gConsole;       // コンソールウィンドウ
/*----------------------------------------------------------------------------------------
 ☆★ キー押下時の処理 ★☆
----------------------------------------------------------------------------------------*/
document.onkeydown = function(e){
  // Mozilla, Opera
  if(e != null){
    keyCode = e.which;
    // イベント実行を防ぐ
    e.preventDefault();
    e.stopPropagation();
  // Internet Explorer
  } else {
    keyCode = event.keyCode;
    // イベント実行を防ぐ
    event.returnValue = false;
    event.cancelBubble = true;
  }
  //「キーを押し始めた」ことの反映
  if(gInputs[keyCode] <= 0) gInputs[keyCode] = 0;
}
/*----------------------------------------------------------------------------------------
 ☆★ キーを離した時の処理 ★☆
----------------------------------------------------------------------------------------*/
document.onkeyup = function(e){
  // Mozilla, Opera
  if(e != null){
    keyCode = e.which;
    // イベント実行を防ぐ
    e.preventDefault();
    e.stopPropagation();
  // Internet Explorer
  } else {
    keyCode = event.keyCode;
    // イベント実行を防ぐ
    event.returnValue = false;
    event.cancelBubble = true;
  }
  //「キーを離した」ことの反映
  gInputs[keyCode] = -1;
}
/*----------------------------------------------------------------------------------------
 ☆★ ウィンドウがフォーカスを失った時の処理 ★☆

 キー入力を消去します( onkeyup イベントが発生しなくなるため)。
----------------------------------------------------------------------------------------*/
window.onblur = function(){
  gInputs = []; for(var i = 0; i < 256; i++) gInputs.push(-1);
}
/*----------------------------------------------------------------------------------------
 ☆★ キーが何フレーム押されているか ★☆

 <keyName>で指定したキーが何フレーム押され続けているかを返します。離すと -1 になり、押され
 始めると再び 0 からカウントされます。
----------------------------------------------------------------------------------------*/
function PressedDuration(keyName){
  return gInputs[ToKc(keyName)];
}
/*----------------------------------------------------------------------------------------
 ☆★ キーは入力開始状態? ★☆

 <keyName>で指定したキーが押され始めたかを取得します。押され始めたフレーム時だけ true を返
 します。<keyName>に負の数を指定(省略時)すると、どのキーにも反応します。
----------------------------------------------------------------------------------------*/
function IsPressed(keyName){
  keyName = InitArg(keyName, -1);
  if(keyName < 0){
    for(i = 0; i < gInputs.length; i++){
      if(gInputs[i] == 1) return true;
    }
    return false;
  }
  return gInputs[ToKc(keyName)] == 1;
}
/*----------------------------------------------------------------------------------------
 ☆★ キーが押されている? ★☆

 <keyName>で指定したキーが押されているかを取得します。押されてから離すまでの間 true を返し
 ます。<keyName>に負の数を指定(省略時)すると、どのキーにも反応します。
----------------------------------------------------------------------------------------*/
function IsHolded(keyName){
  keyName = InitArg(keyName, -1);
  if(keyName < 0){
    for(i = 0; i < gInputs.length; i++){
      if(gInputs[i] > 0) return true;
    }
    return false;
  }
  return gInputs[ToKc(keyName)] > 0;
}
/*----------------------------------------------------------------------------------------
 ☆★ キーは入力を与えている? ★☆

 <keyName>で指定したキーが入力を与えるかを取得します。キーを押し始めた時とキーリピートの最
 中であれば「入力を与えている」と見なされます。<keyName>に負の数を指定(省略時)すると、どの
 キーにも反応します。
----------------------------------------------------------------------------------------*/
function IsInputting(keyName){
  keyName = InitArg(keyName, -1);
  if(keyName < 0){
    for(i = 0; i < gInputs.length; i++){
      if(gInputs[i] == 1) return true;
      if((gInputs[i] - KEY_CHARGE_DURATION - 1) % KEY_REPEAT_SPAN == 0) return true;
    }
    return false;
  }
  var keyCode = ToKc(keyName);
  if(gInputs[keyCode] <= KEY_CHARGE_DURATION) return gInputs[keyCode] == 1;
  return (gInputs[keyCode] - KEY_CHARGE_DURATION - 1) % KEY_REPEAT_SPAN == 0;
}
/*----------------------------------------------------------------------------------------
 ☆★ 文字列をキーコードに変換する ( TO KeyCode ) ★☆

 <keyString>で指定したキーのコードを返します。<keyString>に対応するキーがない場合は 0 を返
 します。複数のキーコードがあるキー(たとえば数字の '0' のキーコードは 48 と 96 (テンキー))
 の場合は、代表する 1 つのコードを返します。
----------------------------------------------------------------------------------------*/
function ToKc(keyString){
  switch(keyString){
  case 'Break':      return   3; break;
  case 'BackSpace':  return   8; break;
  case 'Tab':        return   9; break;
  case 'Enter':      return  13; break;
  case 'Shift':      return  16; break;
  case 'Ctrl':       return  17; break;
  case 'Alt':        return  18; break;
  case 'Pause':      return  19; break;
  case 'Esc':        return  27; break;
  case 'Space':      return  32; break;
  case 'PageUp':     return  33; break;
  case 'PageDown':   return  34; break;
  case 'End':        return  35; break;
  case 'Home':       return  36; break;
  case 'Left':       return  37; break;
  case 'Up':         return  38; break;
  case 'Right':      return  39; break;
  case 'Down':       return  40; break;
  case 'Insert':     return  45; break;
  case 'Delete':     return  46; break;
  case '0':          return  48; break;
  case '1':          return  49; break;
  case '2':          return  50; break;
  case '3':          return  51; break;
  case '4':          return  52; break;
  case '5':          return  53; break;
  case '6':          return  54; break;
  case '7':          return  55; break;
  case '8':          return  56; break;
  case '9':          return  57; break;
  case 'A':          return  65; break;
  case 'B':          return  66; break;
  case 'C':          return  67; break;
  case 'D':          return  68; break;
  case 'E':          return  69; break;
  case 'F':          return  70; break;
  case 'G':          return  71; break;
  case 'H':          return  72; break;
  case 'I':          return  73; break;
  case 'J':          return  74; break;
  case 'K':          return  75; break;
  case 'L':          return  76; break;
  case 'M':          return  77; break;
  case 'N':          return  78; break;
  case 'O':          return  79; break;
  case 'P':          return  80; break;
  case 'Q':          return  81; break;
  case 'R':          return  82; break;
  case 'S':          return  83; break;
  case 'T':          return  84; break;
  case 'U':          return  85; break;
  case 'V':          return  86; break;
  case 'W':          return  87; break;
  case 'X':          return  88; break;
  case 'Y':          return  89; break;
  case 'Z':          return  90; break;
  case 'Windows':    return  91; break;
  case 'Menu':       return  93; break;
  case '*':          return 106; break;
  case '+':          return 107; break;
  case 'F1':         return 112; break;
  case 'F2':         return 113; break;
  case 'F3':         return 114; break;
  case 'F4':         return 115; break;
  case 'F5':         return 116; break;
  case 'F6':         return 117; break;
  case 'F7':         return 118; break;
  case 'F8':         return 119; break;
  case 'F9':         return 120; break;
  case 'F10':        return 121; break;
  case 'F11':        return 122; break;
  case 'F12':        return 123; break;
  case 'NumLock':    return 144; break;
  case 'ScrollLock': return 145; break;
  case ':':          return 186; break;
  case ';':          return 187; break;
  case ',':          return 188; break;
  case '-':          return 189; break;
  case '.':          return 190; break;
  case '/':          return 191; break;
  case '@':          return 192; break;
  case '[':          return 219; break;
  case '\\':         return 220; break;
  case ']':          return 221; break;
  case '^':          return 222; break;
  default:           return   0; break;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ コンソールに表示 ★☆

 コンソールに<value>の内容を表示します。<variableName>に変数名を文字列で指定すると、変数名
 が明示されるためより見やすくなります。

 var a = [1, 2, 3];
 p(a);       // => 1,2,3
 p(a, "a");  // => <a> = 1,2,3
----------------------------------------------------------------------------------------*/
function p(value, variableName){
  // コンソールが開いていない場合は開く
  if(typeof gConsole === 'undefined') openConsole();
  else if(gConsole.closed) openConsole();
  // 文字列の変換
  value = "" + value;  // 文字列化
  value = value.replace(/</g, '&lt;');
  value = value.replace(/>/g, '&gt;');
  if(typeof variableName !== 'undefined'){
    variableName = "" + variableName;  // 文字列化
    variableName = variableName.replace(/</g, '&lt;');
    variableName = variableName.replace(/>/g, '&gt;');
  }
  // コンソールに表示
  if(typeof variableName !== 'undefined'){
    gConsole.document.write('&lt;' + variableName + '&gt; = ');
  }
  gConsole.document.write(value + '<br>');
  // 最下端へスクロール
  gConsole.scroll(0, 16777215);
}
/*----------------------------------------------------------------------------------------
 ☆★ コンソールウィンドウの開始 ★☆

 コンソールウィンドウを開きます。p 内で必要に応じて自動的に開かれます。
----------------------------------------------------------------------------------------*/
function openConsole(){
  var cwOptions = 'width=480, height=160, menubar=no, toolbar=no, scrollbars=yes';
  var cwStyle = '<span style="font-size:8pt;font-family:ＭＳ ゴシック,monospace">';
  gConsole = window.open('about:blank', 'console', cwOptions);
  gConsole.document.write(cwStyle);
}
/*----------------------------------------------------------------------------------------
 ☆★ 定義済の値かデフォルト値を取得 ( INITialize ARGument ) ★☆

 <variable>に値が定義されていない場合はデフォルト値として<defaultValue>を返します。
----------------------------------------------------------------------------------------*/
function InitArg(variable, defaultValue){
  return (typeof variable === 'undefined') ? defaultValue : variable;
}
/*----------------------------------------------------------------------------------------
 ☆★ テキストの表示 ★☆

 <textBoxId>で指定した ID のテキストボックスに文字<text>を表示します。
----------------------------------------------------------------------------------------*/
function Say(textBoxId, text){
  document.getElementById(textBoxId).value = text;
}
/*----------------------------------------------------------------------------------------
 ☆★ 画像の表示 ★☆

 <imageId>で指定した画像のアドレスを<src>にします。アドレスが変わらなければ何もしません。
----------------------------------------------------------------------------------------*/
function SetImage(imageId, src){
  if(document.getElementById(imageId).src != src){
    document.getElementById(imageId).src = src;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 経過時間の指定された部分を取得 ( Elapsed HOURs/MINutes/SEConds/MilliSEConds ) ★☆

 起動からの経過時間のうち、時間/分/秒/ミリ秒 の部分の値を返します。経過時間は経過フレーム数
 から計算した値ですので、実際の時間に対して多少の誤差があります。

 ◎ 起動から 1 時間 23 分 45.678 秒が経過した場合
 p(EHour());  // => 1
 p(EMin());   // => 23
 p(ESec());   // => 45
 p(EMSec());  // => 678
----------------------------------------------------------------------------------------*/
function EHour(){return Math.floor(gFrames / FPS / 3600); }
function EMin() {return Math.floor(gFrames / FPS / 60) % 60; }
function ESec() {return Math.floor(gFrames / FPS) % 60; }
function EMSec(){return Math.floor(gFrames / FPS * 1000) % 1000; }
/*----------------------------------------------------------------------------------------
 ☆★ 経過時間を秒数で取得 ( Elapsed TIME ) ★☆

 起動からの経過時間を秒単位で返します。小数点部分も返されます。EHour() 等と同様に、実際の
 時間に対して多少の誤差があります。
----------------------------------------------------------------------------------------*/
function ETime(){
  return gFrames / FPS;
}
/*----------------------------------------------------------------------------------------
 ☆★ 経過時間を文字列に変換して取得 ( Elapsed Time STRing ) ★☆

 起動からの経過時間を一般的な時間表現で返します。EHour() 等と同様に、実際の時間に対して多
 少の誤差があります。

 ◎ 起動から 1 時間 23 分 45 秒が経過した場合
 p(EtStr());  // => '01:23:45'
------------------------------------------------------------------------------------------
 <hLength>(省略時 2 )で時間の桁数を指定します。その桁数に足りなければ、空いた部分を 0 で
 埋めます。桁数より多い場合は、時間の部分はそのままにします。

 ◎ 起動から 10 時間が経過した場合
 p(EtStr(4));  // => '0010:00:00'
 p(EtStr(3));  // => '010:00:00'
 p(EtStr(2));  // => '10:00:00'
 p(EtStr(1));  // => '10:00:00'
------------------------------------------------------------------------------------------
 <hDelim>(省略時 ':' ), <mDelim>(省略時 ':' ), <sDelim>(省略時 '' )はそれぞれ時間、分、秒
 の区切り記号( Hour/Minute/Second DELIMiter )です。

 ◎ 起動から 1 時間 23 分 45 秒が経過した場合
 p(EtStr(1, '時間', '分', '秒'));  // => '1時間23分45秒'
------------------------------------------------------------------------------------------
 <msLength>(省略時 0 )で秒を小数点何位まで文字列にするかを指定できます。

 ◎ 起動から 1 時間 23 分 45.666 秒が経過した場合
 p(EtStr(undefined, undefined, undefined, undefined, 0));  // => '01:23:45'
 p(EtStr(undefined, undefined, undefined, '.', 1));        // => '01:23:45.6'
 p(EtStr(undefined, undefined, undefined, '.', 2));        // => '01:23:45.66'
 p(EtStr(undefined, undefined, undefined, '.', 3));        // => '01:23:45.666'
----------------------------------------------------------------------------------------*/
function EtStr(hLength, hDelim, mDelim, sDelim, msLength){
  hLength = InitArg(hLength, 2);
  hDelim = InitArg(hDelim, ':');
  mDelim = InitArg(mDelim, ':');
  sDelim = InitArg(sDelim, '');
  msLength = InitArg(msLength, 0);

  var result = '';
  for(var i = hLength - 1; i >= 1; i--){
    if(EHour() < Math.pow(10, i)) result += '0'
  }
  result += EHour() + hDelim;
  result += ('0' + EMin()).slice(-2) + mDelim;
  result += ('0' + ESec()).slice(-2) + sDelim;
  result += (('00' + EMSec()).slice(-3)).slice(0, msLength);
  return result;
}
/*----------------------------------------------------------------------------------------
 ☆★ 小数点の指定位で四捨五入/切り捨て/切り上げ ★☆

 数値<n>を四捨五入/切り捨て/切り上げします。
------------------------------------------------------------------------------------------
 <place>が 0 (省略時)なら整数になるように、正の数なら小数点以下が<place>桁になるように処理
 します。負の数を指定すると -<place>桁目の整数部分を処理します。

 p(Round(1234.5678))      // => 1235
 p(Round(1234.5678, 2))   // => 1234.57
 p(Round(1234.5678, -2))  // => 1200
------------------------------------------------------------------------------------------
 丸め誤差は Justify によって自動修正されます。
----------------------------------------------------------------------------------------*/
function Round(n, place){
  place = InitArg(place, 0);
  return Justify(Math.round(n * Math.pow(10, place)) / Math.pow(10, place));
}
//----------------------------------------------------------------------------------------
function Floor(n, place){
  place = InitArg(place, 0);
  return Justify(Math.floor(n * Math.pow(10, place)) / Math.pow(10, place));
}
//----------------------------------------------------------------------------------------
function Ceil(n, place){
  place = InitArg(place, 0);
  return Justify(Math.ceil(n * Math.pow(10, place)) / Math.pow(10, place));
}
/*----------------------------------------------------------------------------------------
 ☆★ 丸め誤差の修正 ★☆

 <n>の丸め誤差を修正して返します。丸め誤差とは、コンピュータが小数を計算すると生じる微小な
 誤差のことです。

 p(0.01 + 0.05);           // => 0.060000000000000005
 p(Justify(0.01 + 0.05));  // => 0.06
------------------------------------------------------------------------------------------
 具体的には、有効数字が 15 桁になるように四捨五入しています。もともと有効数字が 16 桁以上
 の場合、意図しない値の変化が起こる可能性があります。
----------------------------------------------------------------------------------------*/
function Justify(n){
  // ちょうど 0 ならそのまま返す( log(0) が定義されていないため)
  if(n == 0) return 0;
  // 正の数に変換
  var pn = Math.abs(n);
  // 15 桁の整数に補正
  var cl = Math.floor(Math.log(pn) / Math.LN10);  // Common Logarithm
  pn = Math.round(pn * Math.pow(10, 14 - cl));
  // 文字列化
  var result = "" + pn;
  var zeros = "";
  // 適切な位置に小数点を付加
  if(0 <= cl && cl <= 14){
    result = result.slice(0, cl + 1) + "." + result.slice(cl + 1);
  }else if(cl < 0){
    // 先頭に「0.000…」を付加
    for(var i = 0; i < Math.abs(cl) - 1; i++) zeros += "0";
    result = "0." + zeros + result;
  }else{
    // 最後尾に「000…」を付加
    for(var i = 15; i < cl; i++) zeros += "0";
    result = result + zeros;
  }
  // 再び数値に戻して返す
  return parseFloat(result) * (n > 0 ? 1 : -1);
}
/*----------------------------------------------------------------------------------------
 ☆★ 乱数( RANDom number )の生成 ★☆

 0 以上<n>未満の乱数を整数で返します。<n>に 0 (省略時)が指定された場合は、0 以上 1 未満の
 乱数を実数で返します。
------------------------------------------------------------------------------------------
 <times>に 1 以上の整数を指定した場合は、重複のないように<times>個の乱数配列を作成して返し
 ます。<times>が<n>より大きい場合は、重複しない乱数配列が繰り返し生成されます。

 p(Rand(5, 2))   // => 4,2
 p(Rand(5, 5))   // => 2,0,3,1,4
 p(Rand(5, 15))  // => 1,2,0,3,4,2,1,0,4,3,0,1,4,3,2

 ※ 結果は呼び出されるごとに変わります。
----------------------------------------------------------------------------------------*/
function Rand(n, times){
  n = InitArg(n, 0);
  times = InitArg(times, 0);

  if(times <= 0){
    // 値で返す
    if(n <= 0) return Math.random();
    return Math.floor(Math.random() * n);
  }else{
    // 配列で返す
    var result = [];
    var sequence;
    var choice;
    while(true){
      sequence = [];
      // 連番配列を作成する
      for(var i = 0; i < n; i++) sequence.push(i);
      // 連番配列からランダムで抜き出していく
      for(var i = 0; i < n; i++){
        choice = Math.floor(Math.random() * sequence.length);
        result.push(sequence[choice]);
        // 必要数になったら終了
        if(result.length == times) return result;
        // 抜き出した要素を削除
        sequence = sequence.slice(0, choice).concat(sequence.slice(choice + 1));
      }
    }
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ クッキーへセーブ ★☆

 クッキー( Cookie )に情報を書き込みます。<name>に名前、<value>に値、<expireDays>に有効期限
 までの日数(省略時 7305 (約 20 年間))をそれぞれ指定します。書き込むデータは
 「名前=値; expires=有効期限;」のような書式になります。
------------------------------------------------------------------------------------------
 ブラウザでクッキーの期限や使用禁止が指定されている場合は、そちらが優先されると思います。
----------------------------------------------------------------------------------------*/
function Save(name, value, expireDays){
  expireDays = InitArg(expireDays, 7305);

  // 保存用文字列の作成
  var s = encodeURIComponent(name) + "="
  s += encodeURIComponent(value) + "; expires=";
  // 有効期限の設定
  var xpDate = new Date().getTime();  // eXPire DATE
  xpDate -= 60000 * new Date().getTimezoneOffset();
  xpDate += expireDays * 86400000;
  s += new Date(xpDate).toUTCString();
  // 保存
  document.cookie = s;
}
/*----------------------------------------------------------------------------------------
 ☆★ クッキーからロード ★☆

 クッキーを読み込んで、名前<name>に対応する値を返します。指定した名前が存在しない場合は
 <defaultValue>が返ります。
----------------------------------------------------------------------------------------*/
function Load(name, defaultValue){
  var cookieStr = document.cookie;  // COOKIE STRing
  var namePos = cookieStr.indexOf(name);  // NAME POSition
  if(namePos == -1) return defaultValue;

  var si = namePos + name.length + 1;   // Start Index
  var ei = cookieStr.indexOf(';', si);  // End Index
  ei = (ei == -1) ? cookieStr.length : ei;
  return decodeURIComponent(cookieStr.substring(si, ei));
}
/*----------------------------------------------------------------------------------------
 ☆★ メインループ ★☆

 1 フレームに相当する時間( 1 / <FPS> 秒)が経過したら、フレーム内処理を行います。初期化と割
 り込み(キー入力等)以外は原則としてこのループ内で処理されます。
----------------------------------------------------------------------------------------*/
function MainLoop(){
  // フレーム経過判定
  // setInterval は精度が低いので、フレーム経過判定を別途行って時間管理をしています。
  if(new Date() - gStartTime < 1000 / FPS * gFrames) return;
  gFrames++;
  // 押されているキーの管理
  for(var i = 0; i < 256; i++) if(gInputs[i] >= 0) gInputs[i]++;
  // フレーム内処理。呼び出し側で定義してください
  Main();
}
/*----------------------------------------------------------------------------------------
 ☆★ 終了時処理 ★☆

 別のページに移るときや、閉じるときに自動的に実行される処理です。
----------------------------------------------------------------------------------------*/
window.onbeforeunload = function(){
  // コンソールが開いていれば閉じる
  if(typeof gConsole !== 'undefined') if(!gConsole.closed) gConsole.close();
}
/*----------------------------------------------------------------------------------------
 ☆★ 起動 ★☆

 最初に呼び出されます。初期化とメインループの起動を行います。
----------------------------------------------------------------------------------------*/
function Execute(){
  // モジュール内の初期化処理
  gStartTime = new Date();
  gFrames = 0;
  gInputs = []; for(var i = 0; i < 256; i++) gInputs.push(-1);
  // 初期化処理。呼び出し側で定義してください
  Setup();
  // タイマー起動
  gTimer = setInterval('MainLoop()', LOOP_INTERVAL)
}
/*----------------------------------------------------------------------------------------
 ☆★ オブジェクト: レイヤー ★☆

 div タグ等で指定したブロックをレイヤーとして扱います。初期化時、<id>にはブロックの id
 を指定してください(<div id="my_layer"> の my_layer の部分)。
----------------------------------------------------------------------------------------*/
function Layer(id){
  this.layer = document.getElementById(id);
  /*
  ここで絶対座標指定にしていますが、できる限り前もってスタイルシートで絶対座標指定にしてく
  ださい。例: <div id="my_layer" style="position: absolute;"></div>
  */
  this.layer.style.position = "absolute";
}
/*----------------------------------------------------------------------------------------
 ☆★ 表示 ★☆
----------------------------------------------------------------------------------------*/
Layer.prototype.Show = function(){
  this.layer.style.visibility = "visible";
};
/*----------------------------------------------------------------------------------------
 ☆★ 隠す ★☆
----------------------------------------------------------------------------------------*/
Layer.prototype.Hide = function(){
  this.layer.style.visibility = "hidden";
};
/*----------------------------------------------------------------------------------------
 ☆★ 指定位置に移動 ★☆
----------------------------------------------------------------------------------------*/
Layer.prototype.MoveTo = function(x, y){
  this.layer.style.left = x;
  this.layer.style.top = y;
};
/*----------------------------------------------------------------------------------------
 ☆★ 指定量だけ移動 ★☆
----------------------------------------------------------------------------------------*/
Layer.prototype.MoveBy = function(dX, dY){
  this.layer.style.left = parseFloat(this.layer.style.left) + dX;
  this.layer.style.top = parseFloat(this.layer.style.top) + dY;
};
/*----------------------------------------------------------------------------------------
 ☆★ サイズ変更 ★☆
----------------------------------------------------------------------------------------*/
Layer.prototype.ResizeTo = function(width, height){
  this.layer.style.width = width;
  this.layer.style.height = height;
};
/*----------------------------------------------------------------------------------------
 ☆★ 相対値を指定してサイズ変更 ★☆
----------------------------------------------------------------------------------------*/
Layer.prototype.ResizeBy = function(dWidth, dHeight){
  this.layer.style.width = parseFloat(this.layer.style.width) + dWidth;
  this.layer.style.height = parseFloat(this.layer.style.height) + dHeight;
};
/*----------------------------------------------------------------------------------------
 ☆★ テキスト( HTML ソース)の記入 ★☆

 レイヤーに<text>を記入します。<overwrites>=true ならば上書き、false ならば追加します。
----------------------------------------------------------------------------------------*/
Layer.prototype.Write = function(text, overwrites){
  overwrites = InitArg(overwrites, true);

  if(overwrites) this.layer.innerHTML = text;
  else this.layer.innerHTML += text;
};
