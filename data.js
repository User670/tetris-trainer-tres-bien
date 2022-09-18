/*========================================================================================
 □■ data.js ■□
========================================================================================*/
/*----------------------------------------------------------------------------------------
 ☆★ 定数一覧 ★☆
----------------------------------------------------------------------------------------*/
var MATRIX_WIDTH = 10;               // マトリックスの横ブロック数
var DEADLINE_HEIGHT = 3;             // デッドライン以上でブロックの情報を保持する高さ
var MATRIX_HEIGHT = 23;              // マトリックスの縦ブロック数。デッドライン以上を含む
var SOFT_DROP_SPAN = 1;              // <フレーム> ソフトドロップで 1 マス進むまでの時間
var NATURAL_DROP_SPAN = 36;          // <フレーム> 自然落下で 1 マス進むまでの時間
var LINE_CLEAR_DURATION = 15;        // <フレーム> ライン消去演出の時間
var DISPLAY_FEATURES_DURATION = 45;  // <フレーム> 発動した技の表示時間
var NEXT_MINOS = 5;                  // ネクスト表示数
var ROTATE_RULES = 5;                // 回転ルール数
var HORIZONTAL_CHARGE_DURATION = 7;  // <フレーム> キーを押し始めてから横移動リピート開始までの時間
var HORIZONTAL_REPEAT_SPAN = 1;      // <フレーム> 横移動の時間感覚

var INITIAL_DIR = 0;                  // 出現時のミノの向き
var INITIAL_X = 3;                    // 出現時のミノの X 座標
var INITIAL_Y = DEADLINE_HEIGHT - 2;  // 出現時のミノの Y 座標

var DEFAULT_KEY_MOVE_LEFT    = 'A';
var DEFAULT_KEY_MOVE_RIGHT   = 'D';
var DEFAULT_KEY_SOFTDROP     = 'S';
var DEFAULT_KEY_HARDDROP     = 'W';
var DEFAULT_KEY_ROTATE_RIGHT = 'K';
var DEFAULT_KEY_ROTATE_LEFT  = 'J';
/*
// こなちゃんのキー配置
var DEFAULT_KEY_MOVE_LEFT    = 'S';
var DEFAULT_KEY_MOVE_RIGHT   = 'F';
var DEFAULT_KEY_SOFTDROP     = 'C';
var DEFAULT_KEY_HARDDROP     = 'D';
var DEFAULT_KEY_ROTATE_RIGHT = 'L';
var DEFAULT_KEY_ROTATE_LEFT  = 'J';
*/
/*----------------------------------------------------------------------------------------
 ☆★ マトリックス配列  [y][x] ★☆

 設置済ブロックの配列です。落下中のブロック等は別に管理します。
----------------------------------------------------------------------------------------*/
var gMatrix = [];
for(var i = 0; i < MATRIX_HEIGHT; i++){
  gMatrix.push([]);
  for(var j = 0; j < MATRIX_WIDTH; j++){
    gMatrix[i].push(0);
  }
}
/*----------------------------------------------------------------------------------------
 ☆★ オブジェクト: 各種ブロック ★☆
----------------------------------------------------------------------------------------*/
function Block(id){
  this.id = id;
  this.toVanish = (id == 2);           // 消去予約されているブロック?

  switch(id){
  case 0:  // 空き
    this.passable = true;    // すり抜け可能?
    break;
  case 1:  // 灰色ブロック
    this.passable = false;
    break;
  case 2:  // 消去演出中のブロック。RemoveReservedLines で一斉消去される
    this.passable = true;
    break;
  // 設置済の各ブロック
  case 21: case 22: case 23: case 24: case 25: case 26: case 27:
    this.passable = false;
    break;
  // その他の各ブロック
  case 11: case 12: case 13: case 14: case 15: case 16: case 17:
  case 31: case 32: case 33: case 34: case 35: case 36: case 37:
  case 41: case 42: case 43: case 44: case 45: case 46: case 47:
  case 51: case 52: case 53: case 54: case 55: case 56: case 57:
    this.passable = false;
    break;
  // その他の番号(存在しないブロック)なら画像のキャッシュを取らない
  default:
    this.passable = false;
    return;
  }

  this.image = 'img/b' + id + '.png';  // 画像。24 x 24 ピクセル
  this.cache = new Image();
  this.cache.src = this.image;
}
/*----------------------------------------------------------------------------------------
 ☆★ ブロックオブジェクトへのアクセス ★☆
----------------------------------------------------------------------------------------*/
var gBlocks = [];
for(var i = 0; i <= 57; i++) gBlocks.push(new Block(i));
function BlkEmpty(){return gBlocks[0] }
function BlkVanishing(){return gBlocks[2] }
/*----------------------------------------------------------------------------------------
 ☆★ オブジェクト: 一般的な回転ルール (ROTation RULE - GENeral) ★☆
----------------------------------------------------------------------------------------*/
function RotRuleGen(){
  // [回転方向(0=右, 1=左)][回転前のミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ルール ID ]
  this.dx = [[[0, -1, -1,  0, -1],    // i → r
              [0,  1,  1,  0,  1],    // r → v
              [0,  1,  1,  0,  1],    // v → l
              [0, -1, -1,  0, -1]],   // l → i
             [[0,  1,  1,  0,  1],    // i → l
              [0,  1,  1,  0,  1],    // r → i
              [0, -1, -1,  0, -1],    // v → r
              [0, -1, -1,  0, -1]]];  // l → v
  this.dy = [[[0,  0, -1,  2,  2],    // i → r
              [0,  0,  1, -2, -2],    // r → v
              [0,  0, -1,  2,  2],    // v → l
              [0,  0,  1, -2, -2]],   // l → i
             [[0,  0, -1,  2,  2],    // i → l
              [0,  0,  1, -2, -2],    // r → i
              [0,  0, -1,  2,  2],    // v → r
              [0,  0,  1, -2, -2]]];  // l → v
  return this;
}
/*----------------------------------------------------------------------------------------
 ☆★ オブジェクト: I ミノの回転ルール (ROTation RULE - I) ★☆
----------------------------------------------------------------------------------------*/
function RotRuleI(){
  // [回転方向(0=右, 1=左)][回転前のミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ルール ID ]
  this.dx = [[[0, -2,  1, -2,  1],    // i → r
              [0, -1,  2, -1,  2],    // r → v
              [0,  2, -1,  2, -1],    // v → l
              [0,  1, -2,  1, -2]],   // l → i
             [[0, -1,  2, -1,  2],    // i → l
              [0,  2, -1,  2, -1],    // r → i
              [0,  1, -2,  1, -2],    // v → r
              [0, -2,  1, -2,  1]]];  // l → v
  this.dy = [[[0,  0,  0,  1, -2],    // i → r
              [0,  0,  0, -2,  1],    // r → v
              [0,  0,  0, -1,  2],    // v → l
              [0,  0,  0,  2, -1]],   // l → i
             [[0,  0,  0, -2,  1],    // i → l
              [0,  0,  0, -1,  2],    // r → i
              [0,  0,  0,  2, -1],    // v → r
              [0,  0,  0,  1, -2]]];  // l → v
  return this;
}
/*----------------------------------------------------------------------------------------
 ☆★ 各回転ルールへのアクセス設定 ★☆
----------------------------------------------------------------------------------------*/
var gRotationRuleGeneral = new RotRuleGen();
var gRotationRuleI = new RotRuleI();
/*----------------------------------------------------------------------------------------
 ☆★ オブジェクト: 各種ミノ ★☆
----------------------------------------------------------------------------------------*/
function IMino(){
  this.id = 1;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[0, 0, 0, 0],
                 [1, 1, 1, 1], 
                 [0, 0, 0, 0], 
                 [0, 0, 0, 0]],

                [[0, 0, 1, 0], 
                 [0, 0, 1, 0], 
                 [0, 0, 1, 0], 
                 [0, 0, 1, 0]],

                [[0, 0, 0, 0], 
                 [0, 0, 0, 0],
                 [1, 1, 1, 1],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0], 
                 [0, 1, 0, 0], 
                 [0, 1, 0, 0], 
                 [0, 1, 0, 0]]];
  this.activeBlockId = 11;
  this.placedBlockId = 21;
  this.ghostBlockId  = 31;
  this.guideBlockId  = 41;
  this.ghostGuideBlockId = 51;
  this.rotationRule = gRotationRuleI;
  return this;
}
//----------------------------------------------------------------------------------------
function TMino(){
  this.id = 2;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[0, 1, 0, 0],
                 [1, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0],
                 [0, 1, 1, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 0, 0, 0],
                 [1, 1, 1, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0],
                 [1, 1, 0, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]]];
  this.activeBlockId = 12;
  this.placedBlockId = 22;
  this.ghostBlockId  = 32;
  this.guideBlockId  = 42;
  this.ghostGuideBlockId = 52;
  this.rotationRule = gRotationRuleGeneral;
  return this;
}
//----------------------------------------------------------------------------------------
function JMino(){
  this.id = 3;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[1, 0, 0, 0],
                 [1, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 1, 0],
                 [0, 1, 0, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 0, 0, 0],
                 [1, 1, 1, 0],
                 [0, 0, 1, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0],
                 [0, 1, 0, 0],
                 [1, 1, 0, 0],
                 [0, 0, 0, 0]]];
  this.activeBlockId = 13;
  this.placedBlockId = 23;
  this.ghostBlockId  = 33;
  this.guideBlockId  = 43;
  this.ghostGuideBlockId = 53;
  this.rotationRule = gRotationRuleGeneral;
  return this;
}
//----------------------------------------------------------------------------------------
function LMino(){
  this.id = 4;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[0, 0, 1, 0],
                 [1, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0],
                 [0, 1, 0, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0]],

                [[0, 0, 0, 0],
                 [1, 1, 1, 0],
                 [1, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[1, 1, 0, 0],
                 [0, 1, 0, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]]];
  this.activeBlockId = 14;
  this.placedBlockId = 24;
  this.ghostBlockId  = 34;
  this.guideBlockId  = 44;
  this.ghostGuideBlockId = 54;
  this.rotationRule = gRotationRuleGeneral;
  return this;
}
//----------------------------------------------------------------------------------------
function ZMino(){
  this.id = 5;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[1, 1, 0, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 0, 1, 0],
                 [0, 1, 1, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 0, 0, 0],
                 [1, 1, 0, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0],
                 [1, 1, 0, 0],
                 [1, 0, 0, 0],
                 [0, 0, 0, 0]]];
  this.activeBlockId = 15;
  this.placedBlockId = 25;
  this.ghostBlockId  = 35;
  this.guideBlockId  = 45;
  this.ghostGuideBlockId = 55;
  this.rotationRule = gRotationRuleGeneral;
  return this;
}
//----------------------------------------------------------------------------------------
function SMino(){
  this.id = 6;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[0, 1, 1, 0],
                 [1, 1, 0, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 0, 0],
                 [0, 1, 1, 0],
                 [0, 0, 1, 0],
                 [0, 0, 0, 0]],

                [[0, 0, 0, 0],
                 [0, 1, 1, 0],
                 [1, 1, 0, 0],
                 [0, 0, 0, 0]],

                [[1, 0, 0, 0],
                 [1, 1, 0, 0],
                 [0, 1, 0, 0],
                 [0, 0, 0, 0]]];
  this.activeBlockId = 16;
  this.placedBlockId = 26;
  this.ghostBlockId  = 36;
  this.guideBlockId  = 46;
  this.ghostGuideBlockId = 56;
  this.rotationRule = gRotationRuleGeneral;
  return this;
}
//----------------------------------------------------------------------------------------
function OMino(){
  this.id = 7;
  // [ミノの向き(0=出現時, 1=右, 2=逆, 3=左)][ Y 座標][ X 座標]
  this.shape = [[[0, 1, 1, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 1, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 1, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]],

                [[0, 1, 1, 0],
                 [0, 1, 1, 0],
                 [0, 0, 0, 0],
                 [0, 0, 0, 0]]];
  this.activeBlockId = 17;
  this.placedBlockId = 27;
  this.ghostBlockId  = 37;
  this.guideBlockId  = 47;
  this.ghostGuideBlockId = 57;
  this.rotationRule = gRotationRuleGeneral;  // 必要ないですが便宜上
  return this;
}
/*----------------------------------------------------------------------------------------
 ★☆ T-SPIN 判定に用いるブロック位置 ☆★

 ttt.js の TsType 内から呼び出されます。[dir][y][x]
 1 になっている場所(各 4 箇所)のうち 3 箇所以上が通過不可ならば T-SPIN と判定されます。
----------------------------------------------------------------------------------------*/
var gTsTiles = [[[1, 0, 1, 0],
                 [0, 0, 0, 0],
                 [1, 0, 1, 0],
                 [0, 0, 0, 0]],
                [[1, 0, 1, 0],
                 [0, 0, 0, 0],
                 [1, 0, 1, 0],
                 [0, 0, 0, 0]],
                [[1, 0, 1, 0],
                 [0, 0, 0, 0],
                 [1, 0, 1, 0],
                 [0, 0, 0, 0]],
                [[1, 0, 1, 0],
                 [0, 0, 0, 0],
                 [1, 0, 1, 0],
                 [0, 0, 0, 0]]];
/*----------------------------------------------------------------------------------------
 ★☆ T-SPIN MINI 判定に用いるブロック位置 ☆★

 ttt.js の TsType 内から呼び出されます。[dir][y][x]
//----------------------------------------------------------------------------------------
 T-SPIN が成立している場合、それが通常の T-SPIN か、あるいは T-SPIN MINI かを判定します。
 1 になっている場所(各 2 箇所)が 2 箇所とも通過不可ならば T-SPIN に、そうでなければ T-SPIN
 MINI と判定されます。例外的に、直前に第 5 候補の回転をした場合は T-SPIN MINI にならなくな
 ります( TST 風の回転や「 T-SPIN FIN 」等)。
----------------------------------------------------------------------------------------*/
var gTssTiles = [[[1, 0, 1, 0],
                  [0, 0, 0, 0],
                  [0, 0, 0, 0],
                  [0, 0, 0, 0]],
                 [[0, 0, 1, 0],
                  [0, 0, 0, 0],
                  [0, 0, 1, 0],
                  [0, 0, 0, 0]],
                 [[0, 0, 0, 0],
                  [0, 0, 0, 0],
                  [1, 0, 1, 0],
                  [0, 0, 0, 0]],
                 [[1, 0, 0, 0],
                  [0, 0, 0, 0],
                  [1, 0, 0, 0],
                  [0, 0, 0, 0]]];
/*----------------------------------------------------------------------------------------
 ☆★ 各ミノへのアクセス設定 ★☆
----------------------------------------------------------------------------------------*/
var I = new IMino();
var T = new TMino();
var J = new JMino();
var L = new LMino();
var Z = new ZMino();
var S = new SMino();
var O = new OMino();
var gMino = [null, I, T, J, L, Z, S, O];
/*----------------------------------------------------------------------------------------
 ☆★ オブジェクト: ガイド ★☆

 ミノは自動的に今動かしているものが選ばれます。
----------------------------------------------------------------------------------------*/
function Guide(dir, x, y){
  this.dir = dir;
  this.x = x;
  this.y = y;  // デッドラインの分は含めない
}
/*----------------------------------------------------------------------------------------
 ☆★ ガイドオブジェクト生成の簡略表記 ★☆
----------------------------------------------------------------------------------------*/
function G(dir, x, y){
  return new Guide(dir, x, y);
}
/*----------------------------------------------------------------------------------------
 ☆★ セクション名の取得 ★☆

 <id>番目のセクション名を取得します。ここを編集した場合は、忘れずに index.html にも反映さ
 せてください。
----------------------------------------------------------------------------------------*/
function SectionTitle(id){
  switch(id){
  case  0: return '1. Warming up with Tetris'; break;
  case  1: return '2. A crash course on the rotation of T pieces'; break;
  case  2: return '3. TSD on a T-shaped hole'; break;
  case  3: return '4. TSD on a straight well'; break;
  case  4: return '5. TSD on a straight well (no guides)'; break;
  case  5: return '6. Balancing the stack'; break;
  case  6: return '7. Balancing the stack (no guides)'; break;
  case  7: return '8. Mini T-Spin: a little trick'; break;
  case  8: return '9. T-Spin Triple (T3 / TST): maxing out your attack power'; break;
  case  9: return '10. Constructing a TST'; break;
  case 10: return '11. Well-known openers'; break;
  case 11: return '12. Downstacking'; break;
  case 12: return '13. Digging'; break;
  case 13: return '14. Spinning J and L'; break;
  case 14: return '15. Spinning S and Z'; break;
  case 15: return '16. Spinning I, and weird ways to T-Spin'; break;
  case 16: return '17. Applying SRS (Super Rotation System)'; break;
  case 17: return '18. Applying SRS (no guides)'; break;
  case 18: return '19. Mid-term quiz'; break;
  case 19: return '20. Finesse (O, I, T, J, L)'; break;
  case 20: return '21. Finesse (S, Z)'; break;
  case 21: return '22. More openers'; break;
  case 22: return '23. Balancing by downstacking'; break;
  case 23: return '24. Donation'; break;
  case 24: return '25. Donation (no guides)'; break;
  case 25: return '26. Preparing ahead for T-Spins'; break;
  case 26: return '27. Preparing ahead for T-Spins (no guides)'; break;
  case 27: return '28. Final quiz'; break;
  case 28: return '29. Graduation test (a bit hard)'; break;
  case 29: return '30. Bonus'; break;
  }
  return "???";
}
