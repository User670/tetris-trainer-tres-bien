/*========================================================================================
 □■ ttt.js ■□
========================================================================================*/
/*----------------------------------------------------------------------------------------
 ☆★ グローバル変数一覧 ★☆
----------------------------------------------------------------------------------------*/
var gButton;          // 押されたボタンの名前。フレーム終了時に初期化(空文字列代入)される
var gLyrSections;     // セクション選択レイヤー( LaYeR )
var gLyrProblems;     // 問題選択レイヤー
var gLyrPerform;      // ゲームレイヤー
var gLyrPreferences;  // 設定レイヤー
var gScene;           // シーン名
var gPrevScene;       // 前のフレームでのシーン名( PREVious SCENE )
/*
● シーン構造
 select_sections ⇔ preferences
      ↓↑
 select_problems
   ↓↑
 perform
*/
var gKeys;            // キーの名前
var gSelectForms = ['key_left', 'key_right', 'key_softdrop', 'key_harddrop',
                    'key_rot_right', 'key_rot_left'];  // キー選択ボックスの名前
/*
 キーを追加する際には LoadData() および SavePreferences() への追加、また Key**() (キー名の
 取得メソッド)および設定セレクトボックスの追加を忘れないでください。
*/

var gCurSectionId;    // 選択中( CURrent )のセクション ID
var gCurProblemId;    // 選択中の問題 ID
var gCurProblem;      // 選択中の問題オブジェクト
var gCurProblemReq;   // 問題ノルマ
var gQueue;           // 
var gCurMino;
var gCurX;
var gCurY;
var gCurDir;
var gNdCount;         // ( Natural Drop COUNT )
var gDfCount;         // ( Display Features COUNT )
var gCurGuide;        // 現在のガイド
var gGuidesQueue;     // ガイド配列

var gLineClearCount;  // ライン消去演出のカウント
var gTSpinType;       // 0= T スピンなし, 1= T スピン・ミニ, 2=T スピン
var gRens;            // 継続中の REN 数
var gIsReadyToB2b;    // 次が BACK to BACK になりうる?

/*----------------------------------------------------------------------------------------
 ☆★ 各問題へのアクセス設定 ★☆

 問題データは problem100.js 等に記載されています。
----------------------------------------------------------------------------------------*/
var gProblems = [];
for(var i =   0; i < 100; i++) gProblems.push(new Problem100(i));  // problem100.js
for(var i = 100; i < 200; i++) gProblems.push(new Problem200(i));  // problem200.js
for(var i = 200; i < 300; i++) gProblems.push(new Problem300(i));  // problem300.js
/*----------------------------------------------------------------------------------------
 ☆★ 最終セクション番号の取得 ★☆

 総問題数を元に 10 問とも揃っている最後のセクションの番号を返します。ない場合(総問題数が
 10 問未満のとき)は -1 を返します。
----------------------------------------------------------------------------------------*/
function LastSectionId(){
  return Math.floor((gProblems.length - 9) / 10);
}
/*----------------------------------------------------------------------------------------
 ☆★ 初期化 ★☆

 起動時に 1 度だけ呼び出されます。経過フレーム数は 0 として扱われます。
----------------------------------------------------------------------------------------*/
function Setup(){
  SetupLayers();
  gButton = '';
  gPrevScene = '';
  gScene = 'select_section';
  LoadData();
}
/*----------------------------------------------------------------------------------------
 ☆★ レイヤー初期化 ★☆

 レイヤーのサイズ等は css ファイルで、内容は HTML 上で定義しています。
----------------------------------------------------------------------------------------*/
function SetupLayers(){
  gLyrSections = new Layer('list_sections');
  gLyrProblems = new Layer('list_problems');
  gLyrPerform = new Layer('perform');
  gLyrPreferences = new Layer('preferences');
}
/*----------------------------------------------------------------------------------------
 ☆★ 読込 ★☆

 クッキーから設定と進捗を読み込みます。
----------------------------------------------------------------------------------------*/
function LoadData(){
  // キー設定の読込
  gKeys = [];
  gKeys.push(Load('MoveLeft', DEFAULT_KEY_MOVE_LEFT));
  gKeys.push(Load('MoveRight', DEFAULT_KEY_MOVE_RIGHT));
  gKeys.push(Load('SoftDrop', DEFAULT_KEY_SOFTDROP));
  gKeys.push(Load('HardDrop', DEFAULT_KEY_HARDDROP));
  gKeys.push(Load('RotateRight', DEFAULT_KEY_ROTATE_RIGHT));
  gKeys.push(Load('RotateLeft', DEFAULT_KEY_ROTATE_LEFT));
  // 進捗の読込
  for(var i = 0; i < gProblems.length; i++){
    gProblems[i].cleared = (Load('Prg' + i, '0') == '1');
  }
}


/*----------------------------------------------------------------------------------------
 ☆★ フレーム内処理 ★☆

 1 フレームに 1 回呼び出される処理です。フレーム管理は jsmod.js で行っています。
----------------------------------------------------------------------------------------*/
function Main(){
  // シーンが変わっていれば切り替え
  if(gPrevScene != gScene){
    TerminateScene(gPrevScene);
    SetupScene(gScene);
    //「前のシーン」の更新
    gPrevScene = gScene;
  }
  PerformScene(gScene);
  gButton = '';
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン開始 ★☆
----------------------------------------------------------------------------------------*/
function SetupScene(scene){
  switch(scene){
  case 'select_section':
    gLyrSections.Show();
    break;
  case 'select_problem':
    RefreshSectionTitle();
    RefreshProblemButtons();
    gLyrProblems.Show();
    // 一番上へスクロール
    window.scroll(0, 0);
    break;
  case 'perform':
    gCurMino = null;
    PrepareProblem();
    Refresh();
    gLyrPerform.Show();
    break;
  case 'perform_falling':
    break;
  case 'perform_failed':
    Refresh();
    Say('perform_hint', 'Press any key to try again');
    Say('perform_caption', 'Failed...');
    break;
  case 'perform_cleared':
    Refresh();
    gProblems[gCurProblem.id].cleared = true;
    Save('Prg' + gCurProblem.id, '1');
    Say('perform_caption', 'CLEAR！');
    break;
  case 'preferences':
    // キー設定の表示反映
    for(var i = 0; i < gKeys.length; i++){
      document.getElementById(gSelectForms[i]).value = gKeys[i];
    }
    gLyrPreferences.Show();
    break;
  default:
    gScene = 'select_section';
    break;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン終了 ★☆
----------------------------------------------------------------------------------------*/
function TerminateScene(scene){
  switch(scene){
  case 'select_section':
    gLyrSections.Hide();
    break;
  case 'select_problem':
    gLyrProblems.Hide();
    break;
  case 'perform':
    if(gScene == 'select_problem') gLyrPerform.Hide();
    break;
  case 'perform_falling':
    if(gScene == 'select_problem') gLyrPerform.Hide();
    break;
  case 'perform_failed':
    if(gScene == 'select_problem') gLyrPerform.Hide();
    break;
  case 'perform_cleared':
    if(gScene == 'select_problem' || gScene == 'select_section') gLyrPerform.Hide();
    break;
  case 'preferences':
    gLyrPreferences.Hide();
    break;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン処理 ★☆
----------------------------------------------------------------------------------------*/
function PerformScene(scene){
  switch(scene){
  case 'select_section':
    SceneSelectSection();
    break;
  case 'select_problem':
    SceneSelectProblem();
    break;
  case 'perform':
    ScenePerform();
    break;
  case 'perform_falling':
    ScenePerformFalling();
    break;
  case 'perform_failed':
    ScenePerformFailed();
    break;
  case 'perform_cleared':
    ScenePerformCleared();
    break;
  case 'preferences':
    ScenePreferences();
    break;
  default:
    gScene = 'select_section';
    break;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 問題準備 ★☆
----------------------------------------------------------------------------------------*/
function PrepareProblem(){
  gCurProblem = gProblems[gCurSectionId * 10 + gCurProblemId];
  // ノルマ配列をディープコピー
  gCurProblemReq = [];
  for(var i = 0; i < gCurProblem.req.length; i++){
    gCurProblemReq.push(gCurProblem.req[i]);
  }
  // 情報表示
  DisplayCaption();
  RefreshHint();
  // マトリックス準備
  for(var i = 0; i < DEADLINE_HEIGHT; i++){
    for(var j = 0; j < MATRIX_WIDTH; j++){
      gMatrix[i][j] = 0;
    }
  }
  for(var i = DEADLINE_HEIGHT; i < MATRIX_HEIGHT; i++){
    for(var j = 0; j < MATRIX_WIDTH; j++){
      gMatrix[i][j] = gCurProblem.initialBlocks[i - DEADLINE_HEIGHT][j];
    }
  }
  // ネクスト準備
  gQueue = [];
  gGuidesQueue = [];
  for(var i = 0; i < gCurProblem.ingredients.length; i++){
    gQueue.push(gCurProblem.ingredients[i]);
    if(gCurProblem.guides.length > i) gGuidesQueue.push(gCurProblem.guides[i]);
  }
  // 各種フラグ初期化
  gLineClearCount = -1;
  gTSpinType = 0;
  gRens = -1;
  gIsReadyToB2b = false;
}
/*----------------------------------------------------------------------------------------
 ☆★ 問題タイトル表示 ★☆
----------------------------------------------------------------------------------------*/
function DisplayCaption(){
  var caption = "[" + (gCurSectionId + 1) + "-" + (gCurProblemId + 1) + "]　";
  caption += gCurProblem.caption;
  Say("perform_caption", caption);
}
/*----------------------------------------------------------------------------------------
 ☆★ ネクストを送る ★☆

 ネクストが存在したかを返します。
----------------------------------------------------------------------------------------*/
function Dequeue(){
  if(gQueue.length == 0) return false;
  gCurMino = gQueue.shift();
  gCurDir = INITIAL_DIR;
  gCurX = INITIAL_X;
  gCurY = INITIAL_Y;
  gCurGuide = gGuidesQueue.shift();
  gNdCount = NATURAL_DROP_SPAN;
  RefreshHint();
  return true;
}
/*----------------------------------------------------------------------------------------
 ☆★ ヒント表示を反映 ★☆
----------------------------------------------------------------------------------------*/
function RefreshHint(){
  var hint = gCurProblem.hint;
  if(gCurGuide && gCurProblem.isStrictGuide){
    hint += '\n(Place pieces as indicated)';
  }
  Say('perform_hint', hint);
}
/*----------------------------------------------------------------------------------------
 ☆★ セクション名の記載 ★☆
----------------------------------------------------------------------------------------*/
function RefreshSectionTitle(){
  Say('section_title', SectionTitle(gCurSectionId));
}
/*----------------------------------------------------------------------------------------
 ☆★ クリア状況をボタンに反映 ★☆
----------------------------------------------------------------------------------------*/
function RefreshProblemButtons(){
  var digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  for(var i = 0; i < 10; i++){
    if(gProblems[gCurSectionId * 10 + i].cleared){
      Say('prob' + i, '★' + digits[i] + '. '+gProblems[gCurSectionId * 10 + i].caption+' ');
    }else{
      Say('prob' + i, '　' + digits[i] + '. ' +gProblems[gCurSectionId * 10 + i].caption+' ');
    }
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン: セクション選択 ★☆
----------------------------------------------------------------------------------------*/
function SceneSelectSection(){
  switch(gButton){
  case 'preferences':
    gScene = 'preferences';
    return;
  }
  if(gButton.match(/^section[0-9]+$/)){
    gCurSectionId = parseInt(gButton.substring(7)) - 1;
    gScene = 'select_problem';
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン: 問題選択 ★☆
----------------------------------------------------------------------------------------*/
function SceneSelectProblem(){
  switch(gButton){
  case 'back':
    gScene = 'select_section';
    return;
  case 'previous':
    if(gCurSectionId > 0){
      gCurSectionId--;
      RefreshSectionTitle();
      RefreshProblemButtons();
    }
    return;
  case 'next':
    if(gCurSectionId < LastSectionId()){
      gCurSectionId++;
      RefreshSectionTitle();
      RefreshProblemButtons();
    }
    return;
  }
  if(gButton.match(/^problem[0-9]+$/)){
    gCurProblemId = parseInt(gButton.substring(7)) - 1;
    gScene = 'perform';
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン: レッスン開始 ★☆
----------------------------------------------------------------------------------------*/
function ScenePerform(){
  switch(gButton){
  case 'back':
    gScene = 'select_problem';
    return;
  }
  if(IsPressed()) gScene = 'perform_falling';
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン: レッスン中 ★☆
----------------------------------------------------------------------------------------*/
function ScenePerformFalling(){
  switch(gButton){
  case 'back':
    gScene = 'select_problem';
    return;
  }
  // 技名表示中
  if(gDfCount > 0){
    gDfCount--;
    // カウント終了で表示を戻す
    if(gDfCount == 0) DisplayCaption();
  }
  // ライン消去中
  if(gLineClearCount > 0){
    gLineClearCount--;
    if(gLineClearCount == 0){
      var caption = (gCurSectionId + 1) + "-" + (gCurProblemId + 1) + " ";
      caption += gCurProblem.caption;
      RemoveReservedLines()
    }
    // 他の操作禁止
    return;
  }
  // ミノを操作中でない場合
  if(!gCurMino){
    // クリア確認
    if(ReqIsCleared()) gScene = 'perform_cleared';
    // ネクストを送る。ネクストがなければ失敗
    else if(!Dequeue()){
      gCurMino = null;
      gScene = 'perform_failed';
    }
    // ロックアウト判定
    if(AppearsToLockout()){
      Lockout();
      return;
    }
  // ミノを操作中の場合
  }else{
    // キー入力で分岐
    if(InputsHorizontalMove(true)){
      if(PlaceTest(gCurDir, gCurMino, gCurX + 1, gCurY)){
        gCurX++;
        gTSpinType = 0;
        if(IsLanding()) gNdCount = NATURAL_DROP_SPAN;
      }
    }else if(InputsHorizontalMove(false)){
      if(PlaceTest(gCurDir, gCurMino, gCurX - 1, gCurY)){
        gCurX--;
        gTSpinType = 0;
        if(IsLanding()) gNdCount = NATURAL_DROP_SPAN;
      }
    }
    if(InputsSoftDrop()) SoftDrop();
    if(IsPressed(KeyRR())) RotateRight();
    if(IsPressed(KeyRL())) RotateLeft();
    if(IsPressed(KeyHD())) HardDrop();  // ハードドロップ入力は最後に判定すること
    // 落下/着地処理
    if(--gNdCount <= 0){
      gNdCount = NATURAL_DROP_SPAN;
      if(!IsLanding()){
        gCurY++;
        gTSpinType = 0;
        gLandingCount = NATURAL_DROP_SPAN;
      }else{
        // 着地
        Land();
      }
    }
  }

  Refresh();
}
/*----------------------------------------------------------------------------------------
 ☆★ 横移動を与える? ★☆

 横移動キーを押しっぱなしにしたとき、横移動を与える瞬間かを判断して返します。押し始めた瞬
 間や規定のリピート間隔で true を返します。
----------------------------------------------------------------------------------------*/
function InputsHorizontalMove(toRight){
  keyName = toRight ? KeyR() : KeyL();
  if(PressedDuration(keyName) < HORIZONTAL_CHARGE_DURATION) return IsPressed(keyName);
  return (PressedDuration(keyName) - HORIZONTAL_CHARGE_DURATION) % HORIZONTAL_REPEAT_SPAN == 0;
}
/*----------------------------------------------------------------------------------------
 ☆★ ソフトドロップ実行? ★☆

 押した瞬間と、以降ソフトドロップ間隔が経過する度に true を返します。
----------------------------------------------------------------------------------------*/
function InputsSoftDrop(){
  if(IsPressed(KeySD())) return true;
  if(!IsHolded(KeySD())) return false;
  return PressedDuration(KeySD()) % SOFT_DROP_SPAN == 0;
}
/*----------------------------------------------------------------------------------------
 ☆★ 揃ったラインがあれば消去予約する ★☆

 達成した技 ID を配列にして返します。
----------------------------------------------------------------------------------------*/
function EraseLine(){
  // 揃ったラインの検査
  var eraseLines = [];
  var lineErases;
  for(var i = 0; i < MATRIX_HEIGHT; i++){
    lineErases = true;
    for(var j = 0; j < MATRIX_WIDTH; j++){
      if(gBlocks[gMatrix[i][j]].passable){
        lineErases = false;
        break;
      }
    }
    if(lineErases){
      eraseLines.push(i);
      // ライン削除予約
      ReserveCutLine(i);
    }
  }
  var numEls = eraseLines.length;
  // REN 数管理
  if(numEls == 0) gRens = -1;
  else gRens++;
  // 達成した技 ID の配列を作成
  var features = [];
  switch(numEls){
  case 0:
    if(gTSpinType > 0) features.push(gTSpinType == 1 ? 4 : 5);
    break;
  case 1: features.push([0, 6, 7][gTSpinType]); break;
  case 2: features.push(gTSpinType == 0 ? 1 : 8); break;
  case 3: features.push(gTSpinType == 0 ? 2 : 9); break;
  case 4: features.push(3); break;
  }
  if(numEls >= 1){
    if(gRens >= 1) features.push(100 + gRens);
    if(gIsReadyToB2b && (numEls >= 4 || gTSpinType > 0)) features.push(11);
    if(IsEmptyMatrix()) features.push(10);
  }
  // B2B フラグ管理
  if(numEls >= 1) gIsReadyToB2b = (numEls >= 4 || (gTSpinType > 0 && numEls >= 1));

  return features;
}

/*----------------------------------------------------------------------------------------
 ☆★ マトリックスは空? ★☆
----------------------------------------------------------------------------------------*/
function IsEmptyMatrix(){
  for(var i = 0; i < MATRIX_HEIGHT; i++){
    for(var j = 0; j < MATRIX_WIDTH; j++){
      if(!gBlocks[gMatrix[i][j]].passable) return false;
    }
  }
  return true;
}
/*----------------------------------------------------------------------------------------
 ☆★ ライン消去予約 ★☆

 <line>行目にあるブロックを削除予約します。これらは RemoveReservedLines() で削除されます。
----------------------------------------------------------------------------------------*/
function ReserveCutLine(line){
  for(var i = 0; i < MATRIX_WIDTH; i++){
    gMatrix[line][i] = BlkVanishing().id;
  }
  gLineClearCount = LINE_CLEAR_DURATION;
}
/*----------------------------------------------------------------------------------------
 ☆★ 消去予約済のライン消去 ★☆

 消去予約済のブロックを消去し、できた空間を上から詰めます。
----------------------------------------------------------------------------------------*/
function RemoveReservedLines(){
  for(var i = 0; i < MATRIX_HEIGHT; i++){
    for(var j = 0; j < MATRIX_WIDTH; j++){
      if(gBlocks[gMatrix[i][j]].toVanish){
        for(var k = i; k >= 1; k--){
          gMatrix[k][j] = gMatrix[k - 1][j];
        }
        gMatrix[0][j] = 0;
      }
    }
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 技名取得 ★☆

 複数の技を達成した場合、まとめて 1 つの文字列にして返します。
----------------------------------------------------------------------------------------*/
function FeatureName(features){
  var result = "☆ ";
  for(var i = 0; i < features.length; i++){
    if(i > 0) result += "　";
    switch(features[i]){
    case  0: result += "Single"; break;
    case  1: result += "Double"; break;
    case  2: result += "Triple"; break;
    case  3: result += "Tetris"; break;
    case  4: result += "Mini T-Spin"; break;
    case  5: result += "T-Spin"; break;
    case  6: result += "Mini T-Spin Single"; break;
    case  7: result += "T-Spin Single"; break;
    case  8: result += "T-Spin Double"; break;
    case  9: result += "T-Spin Triple"; break;
    case 10: result += "Perfect Clear"; break;
    case 11: result += "Back to Back"; break;
    default: result += (features[i] - 100) + " Combo"; break;  // 100 + n: n REN
    }
  }
  result += " ☆";
  return result;
}
/*----------------------------------------------------------------------------------------
 ☆★ 接地中? ★☆
----------------------------------------------------------------------------------------*/
function IsLanding(){
  return !PlaceTest(gCurDir, gCurMino, gCurX, gCurY + 1);
}
/*----------------------------------------------------------------------------------------
 ☆★ 着地 ★☆
----------------------------------------------------------------------------------------*/
function Land(){
  // フィールドに反映
  for(var i = 0; i < 4; i++){
    for(var j = 0; j < 4; j++){
      if(IsValidPos(j + gCurX, i + gCurY)){
        if(gCurMino.shape[gCurDir][i][j] == 1){
          gMatrix[i + gCurY][j + gCurX] = gCurMino.placedBlockId;
        }
      }
    }
  }
  // 厳密なガイドなら従わないと失敗に
  if(gCurGuide){
    if(gCurProblem.isStrictGuide && GuideBlocksPos().join() != CurMinoBlocksPos().join()){
      gScene = 'perform_failed';
      gCurMino = null;
      return;
    }
  }
  // ロックアウト判定
  if(LandsToLockout()){
    Lockout();
    return;
  }
  // 技が発動していれば表示および処理
  var features = EraseLine();
  if(features.length > 0){
    // 表示管理
    Say('perform_caption', FeatureName(features));
    gDfCount = DISPLAY_FEATURES_DURATION;
    // ノルマへ反映
    RemoveReq(features);
    // ラインが揃っていればライン消去
    if(IsErased(features)) gLineClearCount = LINE_CLEAR_DURATION;
  }
  // アクティブミノ解除
  gCurMino = null;
}
/*----------------------------------------------------------------------------------------
 ★☆ 着地した結果、ロックアウト? ☆★

 ミノの全ブロックがデッドラインより上になった場合は true を返します。
----------------------------------------------------------------------------------------*/
function LandsToLockout(){
  var minoPos = MinoToBlockPositions(gCurDir, gCurMino, gCurX, gCurY);
  for(var i = 0; i < minoPos.length; i++){
    if(minoPos[i][1] >= DEADLINE_HEIGHT) return false;
  }
  return true;
}
/*----------------------------------------------------------------------------------------
 ★☆ ミノが出現した結果、ロックアウト? ☆★

 ミノのブロックと既存のブロックの位置が 1 つでも重複したら true を返します。
----------------------------------------------------------------------------------------*/
function AppearsToLockout(){
  if(!gCurMino) return;
  return !PlaceTest(INITIAL_DIR, gCurMino, INITIAL_X, INITIAL_Y);
}
/*----------------------------------------------------------------------------------------
 ★☆ ロックアウト時処理 ☆★
----------------------------------------------------------------------------------------*/
function Lockout(){
  gScene = 'perform_failed';
  gCurMino = null;
}
/*----------------------------------------------------------------------------------------
 ☆★ ラインを消した? ★☆
----------------------------------------------------------------------------------------*/
function IsErased(features){
  for(var i = 0; i < features.length; i++){
    switch(features[i]){
    case  0:
    case  1:
    case  2:
    case  3:
    case  6:
    case  7:
    case  8:
    case  9:
    case 10:
    case 11:
      return true;
    }
  }
  return false;
}
/*----------------------------------------------------------------------------------------
 ☆★ ガイドのブロックがある座標の一覧を取得 ★☆
----------------------------------------------------------------------------------------*/
function GuideBlocksPos(){
  var g = gCurGuide;
  return MinoToBlockPositions(g.dir, gCurMino, g.x, g.y + DEADLINE_HEIGHT);
}
/*----------------------------------------------------------------------------------------
 ☆★ 操作中のミノのブロックがある座標の一覧を取得 ★☆
----------------------------------------------------------------------------------------*/
function CurMinoBlocksPos(){
  return MinoToBlockPositions(gCurDir, gCurMino, gCurX, gCurY);
}
/*----------------------------------------------------------------------------------------
 ☆★ 指定位置にミノを置いたときのブロックの座標の一覧を取得 ★☆

 大きさ 2 の配列 [ x 座標, y 座標] の一覧をさらに配列にして返します(事実上 2 次元配列)。
----------------------------------------------------------------------------------------*/
function MinoToBlockPositions(dir, mino, x, y){
  var result = [];
  for(var i = 0; i < 4; i++){
    for(var j = 0; j < 4; j++){
      if(mino.shape[dir][i][j] == 1) result.push([x + j, y + i]);
    }
  }
  return result;
}
/*----------------------------------------------------------------------------------------
 ☆★ ハードドロップをすると Y がどれだけ増加( DIFFerence of Y )するかを取得 ★☆
----------------------------------------------------------------------------------------*/
function HarddropDiffY(){
  var i = 0;
  while(PlaceTest(gCurDir, gCurMino, gCurX, gCurY + i)){
    i++;
  }
  // 通過不能になる直前の点までの増加量を返す
  return i - 1;
}
/*----------------------------------------------------------------------------------------
 ☆★ ハードドロップ ★☆
----------------------------------------------------------------------------------------*/
function HardDrop(){
  var dY = HarddropDiffY();
  if(dY > 0) gTSpinType = 0;
  gCurY += dY;
  gNdCount = 0;
  gLandingCount = 0;
}
/*----------------------------------------------------------------------------------------
 ☆★ ソフトドロップ ★☆
----------------------------------------------------------------------------------------*/
function SoftDrop(){
  if(!IsLanding()){
    gCurY++;
    gTSpinType = 0;
    gNdCount = NATURAL_DROP_SPAN;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 達成した技に応じてノルマ( REQuired features )を減らす ★☆
----------------------------------------------------------------------------------------*/
function RemoveReq(features){
  var index;
  for(var i = 0; i < features.length; i++){
    index = (features[i] > 100) ? 12 : features[i];
    gCurProblemReq[index]--;
    // T スピンなら通常の消し方のノルマも減らす。たとえば TST ならトリプルのノルマも減らす
    switch(index){
    case 6:
    case 7:
      gCurProblemReq[0]--;
      break;
    case 8:
      gCurProblemReq[1]--;
      break;
    case 9:
      gCurProblemReq[2]--;
      break;
    }
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ ノルマクリア? ★☆
----------------------------------------------------------------------------------------*/
function ReqIsCleared(){
  for(var i = 0; i < gCurProblemReq.length; i++){
    if(gCurProblemReq[i] > 0) return false;
  }
  return true;
}
/*----------------------------------------------------------------------------------------
 ☆★ 指定座標にミノを置ける? ★☆
----------------------------------------------------------------------------------------*/
function PlaceTest(dir, mino, x, y){
  var block;
  for(var i = 0; i < 4; i++){
    for(var j = 0; j < 4; j++){
      if(IsValidPos(x + j, y + i)){
        block = gBlocks[gMatrix[y + i][x + j]];
        if(mino.shape[dir][i][j] == 1 && !block.passable) return false;
      }else{
        // 無効な場所でデッドラインより上以外なら置けない
        if(mino.shape[dir][i][j] == 1 && 
                (x + j < 0 || MATRIX_WIDTH <= x + j || MATRIX_HEIGHT <= y + i)){
          return false;
        }
      }
    }
  }
  return true;
}
/*----------------------------------------------------------------------------------------
 ☆★ 指定座標は配列の範囲内? ★☆
----------------------------------------------------------------------------------------*/
function IsValidPos(x, y){
  return (0 <= x && x < MATRIX_WIDTH && 0 <= y && y < MATRIX_HEIGHT);
}
/*----------------------------------------------------------------------------------------
 ☆★ 画面上にミノを描画 ★☆
----------------------------------------------------------------------------------------*/
function DisplayMino(dir, mino, x, y, blockId){
  var block;  // 0=空き, 1=あり

  for(var i = 0; i < 4; i++){
    for(var j = 0; j < 4; j++){
      DisplayBlock(x + j, y + i, mino.shape[dir][i][j] * blockId, true);
    }
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ ブロックの描画 ★☆

 マトリックス上の座標(<x>, <y>)に ID が<blockId>のブロックを描画します。 <ignoresZero>に
 true を指定すると、ID が 0 のブロックを描画しません(透明として扱う)。
----------------------------------------------------------------------------------------*/
function DisplayBlock(x, y, blockId, ignoresZero){
  if(ignoresZero && blockId == 0) return;
  if(CanDisplayPos(x, y)){
     SetImage("m" + (y - DEADLINE_HEIGHT) + "_" + x, gBlocks[blockId].cache.src);
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 通行可? ★☆
----------------------------------------------------------------------------------------*/
function IsPassable(x, y){
  if(x < 0 || MATRIX_WIDTH <= x || MATRIX_HEIGHT <= y) return false;
  if(y < 0) return true;
  return gBlocks[gMatrix[y][x]].passable;
}
/*----------------------------------------------------------------------------------------
 ☆★ 表示区域内? ★☆
----------------------------------------------------------------------------------------*/
function CanDisplayPos(x, y){
  return (0 <= x && x < MATRIX_WIDTH && DEADLINE_HEIGHT <= y && y < MATRIX_HEIGHT);
}
/*----------------------------------------------------------------------------------------
 ☆★ 右回転 ★☆
----------------------------------------------------------------------------------------*/
function RotateRight(){
  Rotate(true);
}
/*----------------------------------------------------------------------------------------
 ☆★ 左回転 ★☆
----------------------------------------------------------------------------------------*/
function RotateLeft(){
  Rotate(false);
}
/*----------------------------------------------------------------------------------------
 ☆★ 回転 ★☆

 <toRight>が true なら右回転、false なら左回転をします。
----------------------------------------------------------------------------------------*/
function Rotate(toRight){
  var newDir = (gCurDir + (toRight ? 1 : 3)) % 4;
  var rotRule = gCurMino.rotationRule;
  var newX, newY;
  var rotateRuleId;
  // 回転ルールのテスト。成功したら反映
  var canRotate = false;
  for(var i = 0; i < ROTATE_RULES; i++){
    newX = gCurX + rotRule.dx[toRight ? 0 : 1][gCurDir][i];
    newY = gCurY + rotRule.dy[toRight ? 0 : 1][gCurDir][i];
    if(PlaceTest(newDir, gCurMino, newX, newY)){
      gCurX = newX;
      gCurY = newY;
      gCurDir = newDir;
      canRotate = true;
      rotateRuleId = i;
      break;
    }
  }
  if(canRotate){
    SetTSpinType(i);
    if(IsLanding()) gNdCount = NATURAL_DROP_SPAN;
  }
}
/*----------------------------------------------------------------------------------------
 ★☆ T-SPIN 成立判定 ☆★

 T-SPIN 不成立なら 0、T-SPIN MINI なら 1、T-SPIN なら 2 を返します。
//----------------------------------------------------------------------------------------
 回転処理の中で取得してください。
 次の条件を満たすと T-SPIN になります。
 ・ T ミノであること
 ・最後に成功した操作が回転である(この関数を呼び出す前提)
 ・凸部の周囲 4 ブロック( ※ と × の部分)のうち 3 箇所以上にブロックがある

 さらに次の条件のどちらかを満たすと T-SPIN に、満たさないと T-SPIN MINI になります。
 ・凸部の両隣( ※ の部分)の 2 箇所ともブロックがある
 ・直前の回転が第 5 候補( TST 風の回転、「 T-SPIN FIN 」等)である

 ※■※　×■※　×　×　※■×
 ■■■　　■■　■■■　■■
 ×　×　×■※　※■※　※■×

 回転以外の操作が成功したときは T-SPIN フラグ gTSpinType を 0 にしてください。
//----------------------------------------------------------------------------------------
 細かい条件はソフトによって異なるようです。とりあえず、壁蹴りや滑り込みの T-SPIN が MINI
 と判定されていれば良いと思われます。
----------------------------------------------------------------------------------------*/
function SetTSpinType(rotateRuleId){
  if(gCurMino != T) return 0;

  var tsCnt = 0;
  var tssCnt = 0;
  var isBlock = false;
  // TS 条件および TSS 条件の何箇所に通行不可ブロックがあるか
  for(var i = 0; i < T.shape[gCurDir].length; i++){
    for(var j = 0; j < T.shape[gCurDir][i].length; j++){
      if(IsValidPos(j + gCurX, i + gCurY)){
        isBlock = !gBlocks[gMatrix[i + gCurY][j + gCurX]].passable;
      }else{
        isBlock = true;
      }
      if(isBlock){
        if(gTsTiles[gCurDir][i][j] > 0) tsCnt++;
        if(gTssTiles[gCurDir][i][j] > 0) tssCnt++;
      }
    }
  }
  // TSS か TSM かの判定
  if(tsCnt >= 3){
    gTSpinType = (tssCnt >= 2 || rotateRuleId == 4) ? 2 : 1;
  }else{
    gTSpinType = 0;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 表示を反映 ★☆
----------------------------------------------------------------------------------------*/
function Refresh(){
  RefreshMatrix();
  RefreshQueue();
}
/*----------------------------------------------------------------------------------------
 ☆★ マトリックス反映 ★☆
----------------------------------------------------------------------------------------*/
function RefreshMatrix(){
  RefreshPlacedMino();
  RefreshGhostAndGuide();
  RefreshActiveMino();
}
/*----------------------------------------------------------------------------------------
 ☆★ 設置済ブロック反映 ★☆
----------------------------------------------------------------------------------------*/
function RefreshPlacedMino(){
  for(var i = DEADLINE_HEIGHT; i < MATRIX_HEIGHT; i++){
    for(var j = 0; j < MATRIX_WIDTH; j++){
      SetImage("m" + (i - DEADLINE_HEIGHT) + "_" + j, gBlocks[gMatrix[i][j]].image);
    }
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 落下中ミノ反映 ★☆
----------------------------------------------------------------------------------------*/
function RefreshActiveMino(){
  if(gCurMino) DisplayMino(gCurDir, gCurMino, gCurX, gCurY, gCurMino.activeBlockId);
}
/*----------------------------------------------------------------------------------------
 ☆★ ゴーストミノとガイドミノ反映 ★☆
----------------------------------------------------------------------------------------*/
function RefreshGhostAndGuide(){
  if(!gCurMino) return;
  var ghostBlks = MinoToBlockPositions(gCurDir, gCurMino, gCurX, gCurY + HarddropDiffY());
  // ゴーストミノの描画
  for(var i = 0; i < ghostBlks.length; i++){
    DisplayBlock(ghostBlks[i][0], ghostBlks[i][1], gCurMino.ghostBlockId, true);
  }

  var g = gCurGuide;
  if(!g) return;
  var guideBlks = MinoToBlockPositions(g.dir, gCurMino, g.x, g.y + DEADLINE_HEIGHT);
  // 共通部分の探索
  var ghostGuideBlks = [];
  for(var i = 0; i < ghostBlks.length; i++){
    for(var j = 0; j < guideBlks.length; j++){
      if(ghostBlks[i][0] == guideBlks[j][0] && ghostBlks[i][1] == guideBlks[j][1]){
        ghostGuideBlks.push([ghostBlks[i][0], ghostBlks[i][1]]);
      }
    }
  }
  // ガイドミノの描画
  for(var i = 0; i < guideBlks.length; i++){
    DisplayBlock(guideBlks[i][0], guideBlks[i][1], gCurMino.guideBlockId, true);
  }
  // 共通部分の描画
  for(var i = 0; i < ghostGuideBlks.length; i++){
    DisplayBlock(ghostGuideBlks[i][0], ghostGuideBlks[i][1], gCurMino.ghostGuideBlockId, true);
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ ネクスト反映 ★☆

 空欄( 0 )か移動中のブロック( 11 ～ 17 )の画像を表示します。1 マス下にずらします。
----------------------------------------------------------------------------------------*/
function RefreshQueue(){
  var mino;
  var filename;
  var i = 0;
  while(i < Math.min(gQueue.length, NEXT_MINOS)){
    mino = gQueue[i];
    for(var j = 0; j < 3; j++){
      for(var k = 0; k < 4; k++){
        SetImage("n" + i + "_" + (j + 1) + "_" + k,
                 gBlocks[mino.shape[0][j][k] * mino.activeBlockId].cache.src);
      }
    }
    i++;
  }
  // 空欄
  while(i < NEXT_MINOS){
    for(var j = 0; j < 4; j++){
      for(var k = 0; k < 4; k++){
        SetImage("n" + i + "_" + j + "_" + k, gBlocks[0].cache.src);
      }
    }
    i++;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン: レッスン失敗 ★☆
----------------------------------------------------------------------------------------*/
function ScenePerformFailed(){
  switch(gButton){
  case 'back':
    gScene = 'select_problem';
    return;
  }
  if(IsPressed()) gScene = 'perform';
}
/*----------------------------------------------------------------------------------------
 ☆★ シーン: クリア ★☆
----------------------------------------------------------------------------------------*/
function ScenePerformCleared(){
  switch(gButton){
  case 'back':
    gScene = 'select_problem';
    return;
  }
  if(IsPressed()) AfterClear();
}
/*----------------------------------------------------------------------------------------
 ☆★ クリア後のキー操作 ★☆

 「問題10」ならばセクション一覧へ、それ以外なら次の問題に進みます。
----------------------------------------------------------------------------------------*/
function AfterClear(){
  if(gCurProblemId == 9) gScene = 'select_problem';
  else{
    gCurProblemId++;
    gScene = 'perform';
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 各キー名の取得 ★☆
----------------------------------------------------------------------------------------*/
function KeyL() {return gKeys[0]; }  // move Left
function KeyR() {return gKeys[1]; }  // move Right
function KeySD(){return gKeys[2]; }  // SoftDrop
function KeyHD(){return gKeys[3]; }  // HardDrop
function KeyRR(){return gKeys[4]; }  // Rotate Right
function KeyRL(){return gKeys[5]; }  // Rotate Left
/*----------------------------------------------------------------------------------------
 ☆★ シーン: 設定 ★☆
----------------------------------------------------------------------------------------*/
function ScenePreferences(){
  switch(gButton){
  case 'ok':
    if(SavePreferences()) gScene = 'select_section';
    break;
  case 'cancel':
    gScene = 'select_section';
    break;
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ 設定の保存 ★☆

 保存が成功したかどうかを返します。
----------------------------------------------------------------------------------------*/
function SavePreferences(){
  // 重複不可
  if(KeyDuplicates()){
    alert("You have duplicate keys in your bindings.");
    return false;
  }
  // 設定反映
  for(var i = 0; i < gKeys.length; i++){
    gKeys[i] = document.getElementById(gSelectForms[i]).value;
  }
  // クッキーに保存
  Save('MoveLeft', gKeys[0]);
  Save('MoveRight', gKeys[1]);
  Save('SoftDrop', gKeys[2]);
  Save('HardDrop', gKeys[3]);
  Save('RotateRight', gKeys[4]);
  Save('RotateLeft', gKeys[5]);
  return true;
}
/*----------------------------------------------------------------------------------------
 ☆★ キーが重複? ★☆

 各セレクトボックスを確認して、重複があるかどうかを判定して返します。
----------------------------------------------------------------------------------------*/
function KeyDuplicates(){
  var target1, target2;
  for(var i = 0; i < gSelectForms.length; i++){
    target1 = document.getElementById(gSelectForms[i]).value;
    for(var j = i + 1; j < gSelectForms.length; j++){
      target2 = document.getElementById(gSelectForms[j]).value;
      if(target1 == target2) return true;
    }
  }
  return false;
}
