//-----------------------------------------------
//	@fileoverview 幻想神域　ダメージ計算シミュレータ
//	初版：2015/10/01
//	@license Copyright (c) 2015 うみゅ
//	This software is released under the MIT License.
//	http://opensource.org/licenses/mit-license.php
//	使用ライブラリ		jQuery (MIT)
//					jQuery UI (MIT)
//					decimal.js (MIT)
//-----------------------------------------------
// ■ライブラリdecimal.jsのメモ
//　クラス	decimalの演算子
//　#plus	+
//　#minus	-
//　#times	*
//　#div	/
//  #eq		==
//　#toNumber	数字化

// strictモードに設定
'use strict';
// ★デバック用★
// @param {object} obj
function Debug(obj) {
//console.log(obj);
};
// @param {Array} params
// @param {bool} origin 1オリジンの時はtrueを設定
function Enum(params, origin) {
	var based = origin ? 1 : 0;
	for (var i = 0,l = params.length; i < l; i++) {
		var key = params[i];
		if(undefined !== this[key]) {
			throw new Error(); // 既に登録済み
		}
		var index = i + based;
		this[key] = index;
		this[index] = key;
		Object.defineProperty(this, index, { enumerable:false });
	}
};
// @return {Array}
Enum.prototype.GetNames = function() {
	return Object.keys(this);
};
Object.defineProperty(Enum.prototype, 'GetNames', { enumerable:false });
// @return {Array}
Enum.prototype.GetValues = function() {
	var values = $.map( Object.keys(this), function( name, value) {
		return value;
	});
	return values;
};
Object.defineProperty(Enum.prototype, 'GetValues', { enumerable:false });

var App = App || {};

//-----------------------------------------------
//　クラス：Util
// @constructor
//-----------------------------------------------
var Util = function() {
};

// クリップボードに値を保存　★未実装★
// @return {string}
Util.CopyToClipboard = function() {
	if(window.clipboardData) {
		return 'window.alert("クリップボード未対応です");';
	}
	return '';
};
// 総乗した結果を値として返す。
// @param {object.<decimal>} obj
// @return {decimal}
Util.summaryProduct = function(obj) {
	var result = Decimal.ONE;
	for(var key in obj) {
		if(obj.hasOwnProperty(key)) {
			result = result.times(obj[key]);
		}
	}
	return result;
};
// 文字列→数値に変換
// 小数点には対応していない。
// @param {string} str
// @param {number} defaultValue
// @return {number}
Util.parseInt = function(str, defaultValue) {
	defaultValue = defaultValue || 0;
	var n = parseInt(str, 10);
	if(isNaN(n)) {
		return defaultValue;
	}else {
		return n;	
	}
};
// スキルダメージは 0.9 ～ 1.1
// @param {decimal} dec
// @return {object.<decimal>}
Util.MAX_MIN = function(dec) {
	var result = {
		基準 : dec,
		下限 : dec.times(0.9),
		上限 : dec.times(1.1),
	};
	return result;
};
// 五捨六入
// @param {decimal} dec
// @return {decimal}
Util.ROUND_HALF_DOWN= function(dec) {
	return dec.plus(0.4).floor();
};
// 基準防御力
// @param {decimal} lv	レベル
// @return {number}
Util.BASED_DEFENSE = function(lv) {
	var 変換係数 = 5 * Math.pow(lv.toNumber(), 2) + 150;
	// 変換係数の75%（小数点以下：切捨て）
	var 基準防御力 = new Decimal(変換係数).times(0.75).floor().toNumber();
	return 基準防御力;
};

//初期化処理
(function () {
	App.VERSION = '0.5.8';
	// 属性一覧
	App.ELEMENTS = new Enum(['無', '火', '氷', '雷', '風', '聖', '闇']);
	// ボス一覧
	// 　名前,　LV,　属性,　ダメージ減算(ID、特殊、靱性）,　防御上昇%
	// 　LVが -1は未選択、0はHTMLタグのoptgroup
	App.MONSTERS = [
		['未選択', -1],
		['80LV　ID', 0],
		['◆異界・黄昏の密林(地獄級)', 0],　// ラビスは与ダメログ表示がないのでリストから除外
		['LV88 フォーラ', 88, App.ELEMENTS.火, 70, 84, 70, 0],
		['LV88 リールー', 88, App.ELEMENTS.氷, 70, 84, 70, 0],
		['LV89 マンティコア', 89, App.ELEMENTS.風, 70, 84, 70, 0],
		['LV90 グレイス', 90, App.ELEMENTS.闇, 70, 84, 70, 0],
		['◆時の書庫', 0],
		['LV85 ブライアン', 85, App.ELEMENTS.無, 48, 0, 60, 0],
		['LV85 クリーチャー・ブライアン', 85, App.ELEMENTS.闇, 48, 0, 60, 0],
		['LV85 パパール・ライアン(無)', 85, App.ELEMENTS.無, 48, 0, 60, 0],
		['LV85 パパール・ライアン(闇)', 85, App.ELEMENTS.闇, 48, 0, 60, 0],
		['LV85 パパール・ライアン(聖)', 85, App.ELEMENTS.聖, 48, 0, 60, 0],
		['LV85 起源の使者・ニノ', 85, App.ELEMENTS.聖, 48, 0, 60, 0],
		// 4層～
		['LV85 フェアリー・ディール', 85, App.ELEMENTS.風, 63, 0, 75, 0],
		['LV85 ガイア', 85, App.ELEMENTS.雷, 63, 0, 75, 0],
		['LV85 ブラッドマスク・タイタニオ', 85, App.ELEMENTS.闇, 63, 0, 75, 0],
		['LV85 アーガス', 85, App.ELEMENTS.無, 63, 0, 75, 0],
		// 7層～
		['LV85 アルジャーナ', 85, App.ELEMENTS.氷, 70, 0, 85, 0],
		['LV85 フォールン', 85, App.ELEMENTS.雷, 70, 0, 85, 0],
		['LV85 タラムダン', 85, App.ELEMENTS.闇, 70, 0, 85, 0],
		['◆双蛇の禁域', 0],
		['LV86 プロトガンダIV', 86, App.ELEMENTS.無, 70, 84, 50, 0],
		['LV87 ザダム', 87, App.ELEMENTS.氷, 70, 84, 50, 100],
		['LV88 ヘルガ', 88, App.ELEMENTS.雷, 70, 84, 50, 150],
		['◆古代の墓場', 0],
		['LV86 ビゲーベル', 86, App.ELEMENTS.火, 70, 84, 50, 0],
		['LV87 ゴルスト', 87, App.ELEMENTS.火, 70, 84, 50, 100],
		['LV88 サルキス', 88, App.ELEMENTS.氷, 70, 84, 50, 150],
		['75LV　ID', 0],
		['◆水楼郭', 0],
		['LV80 ウルネラ', 80, App.ELEMENTS.氷, 90, 84, 50, 0],
		['LV81 テグネール', 81, App.ELEMENTS.氷, 90, 84, 50, 0],
		['LV82 カール', 82, App.ELEMENTS.氷, 90, 84, 50, 0],
		['LV83 サルキス', 83, App.ELEMENTS.氷, 90, 84, 50, 0],
		['◆千雷宮', 0],
		['LV80 ローク', 80, App.ELEMENTS.雷, 90, 84, 50, 0],
		['LV81 ムラウ', 81, App.ELEMENTS.雷, 90, 84, 50, 0],
		['LV82 シルフィノット', 82, App.ELEMENTS.雷, 90, 84, 50, 0],
		['LV83 ヘルガ', 83, App.ELEMENTS.雷, 90, 84, 50, 0],
		['◆黄昏の密林(地獄級)', 0],
		['LV83 フォーラ', 83, App.ELEMENTS.火, 70, 84, 50, 0],
		['LV83 リールー', 83, App.ELEMENTS.氷, 70, 84, 50, 0],
		['LV84 マンティコア', 84, App.ELEMENTS.風, 70, 84, 50, 0],
		['LV85 グレイス', 85, App.ELEMENTS.闇, 70, 84, 50, 0],
		['◆異界・クロノアビスの湿地(地獄級)', 0],
		['LV80 ピオじい', 80, App.ELEMENTS.無, 60, 0, 50, 0],
		['LV80 ピオばあ', 80, App.ELEMENTS.無, 60, 0, 50, 0],
		['LV81 チノリー', 81, App.ELEMENTS.無, 60, 0, 50, 0],
		['LV82 チノビー', 82, App.ELEMENTS.無, 60, 0, 50, 0],
		['◆黄金深淵', 0],
		['LV85 ファフニール', 85, App.ELEMENTS.闇, 90, 45, 50, 0],
		['◆異界・テダの遺跡(地獄級)', 0],
		['LV81 ラース', 81, App.ELEMENTS.闇, 90, 84, 50, 0],
		['LV81 ツインギガス', 81, App.ELEMENTS.風, 90, 84, 50, 0],
		['LV82 ツインギガス', 82, App.ELEMENTS.風, 90, 84, 50, 0],
		['LV83 ルクスリア', 83, App.ELEMENTS.風, 90, 84, 50, 0],
		['◆異界・カディラの森(地獄級)', 0],
		['LV81 モラクス', 81, App.ELEMENTS.闇, 90, 84, 50, 0],
		['LV82 ヘルスパイダー・バアル', 82, App.ELEMENTS.無, 90, 84, 50, 0],
		['LV83 グラトニー', 83, App.ELEMENTS.闇, 90, 84, 50, 0],
		['------------------------------------------', 0],
		['70LV　＜　オポポ　＞', 0],
		['◆異界・アグスの深穴(地獄級)', 0],
		['LV75 教祖・ザーナ', 75, App.ELEMENTS.無, 90, 84, 0, 0],
		['LV76 アデラージョ', 76, App.ELEMENTS.火, 90, 84, 0, 0],
		['LV77 アーガス', 77, App.ELEMENTS.無, 90, 84, 0, 0],
		['◆異界・ホタルの洞窟(地獄級)', 0],
		['LV75 スレイヤー', 75, App.ELEMENTS.氷, 90, 84, 0, 0],
		['LV76 トルス・タートル', 76, App.ELEMENTS.氷, 90, 84, 0, 0],
		['LV77 アルジャーナ', 77, App.ELEMENTS.氷, 90, 84, 0, 0],
		['◆旋塵殿', 0],
		['LV77 ウララ', 77, App.ELEMENTS.風, 90, 84, 0, 0],
		['LV78 ラネブ', 78, App.ELEMENTS.無, 90, 84, 0, 0],
		['LV79 ダルタン', 79, App.ELEMENTS.闇, 90, 84, 0, 0],
		['LV80 マンティコア', 80, App.ELEMENTS.風, 90, 84, 0, 0],
		['◆熔哭洞', 0],
		['LV77 ホクウォール', 77, App.ELEMENTS.火, 90, 84, 0, 0],
		['LV78 フレイムリッド八世', 78, App.ELEMENTS.火, 90, 84, 0, 0],
		['LV79 ベルール', 79, App.ELEMENTS.闇, 90, 84, 0, 0],
		['LV80 シャートル', 80, App.ELEMENTS.火, 90, 84, 0, 0],
		['------------------------------------------', 0],
		['60LV　ID', 0],
		['◆コンドル高原', 0],
		['LV65 堕天使オーサン', 65, App.ELEMENTS.火, 0, 0, 0, 0]
	];
	// 武器一覧
	App.WEPONS = new Enum(
		['シールドソード','バトルアックス','ツインソード',
		 'ダブルガン','キャノン','ハープ',
		 'ロッド','グリモワール','ダガー',
		 'アークス','太刀','サイズ',
		 '聖剣','手裏剣']
		,true);
	// ダイアログ＜防御減少スキル＞
	// 名前, スキル係数, スタック数
	App.DEFENCE_DOWN_SKILL = [
		['未選択', -1],
		['ドラゴンスラッシュ', 0.52, 1],
		['ライトタレットガン', 0.104, 5],
		['翔疾風', 0.104, 5],
		['ポイズンシュート', 0.208, 3],
		['シャープエッジ', 0.39, 1],
		['スイフトアタック', 0.338, 1],
		['エレメントキャスティング（氷ルーン）', 0.13, 5],
		['ネクロ・ヴァンパイアリック', 0.52, 1],
		['幻神スキル', 0.26, 1],
		['複合スキル', 0.39, 1],
	];
	// チャージスキル
	App.CHARGE_TYPE = new Enum(['無', '50', '100']);
	//　属性武器
	App.ELEMENT_WEAPON = 0.20;
	//　属性一致軽減
	App.ELEMENT_BODY = 0.25;
	App.LV75 = 75;
	//　DOT ステータス攻撃に99P振りの時の補正値
	App.DOT_ATK_COEFFICIENT = 1.3465;
	// 単体テストデータの項目区切り
	App.COLUMN_SEPARATOR = '|';
	// URL引数
	App.URLQUERY_PARAMSKEY = 'p';
	// URLフォーマットバージョン
	App.URLFORMAT_VERSION = '4';
	// StringクラスにstartsWith関数を追加
    String.prototype.startsWith = String.prototype.startsWith || function(searchString, position) {
                position = position || 0;
                return this.lastIndexOf(searchString, position) === position;
  	};
	// ArrayクラスにisArray関数を追加
	Array.isArray = Array.isArray || function (vArg) {
    	return Object.prototype.toString.call(vArg) === "[object Array]";
  	};
	// 例外エラーをoffに設定。Decimalクラスの値が非数値の時、Number.NaN値となる。
	Decimal.config({ errors: false });
	// Decimalクラスは不変クラスなため、計算に使うstatic変数を追加する。
	Decimal.ZERO = Decimal.ZERO || new Decimal(0);
	Decimal.HUNDRED = Decimal.HUNDRED || new Decimal(100);
	jQuery.event.add(window, 'load', function() {
            UI.OnLoad();
  	});
//-----------------------------------------------
//　クラス：SkillBuilder
// 概要：Skillクラス用のBuilderクラス
// @param {number}　wepon	武器種（App.WEPONS）
// @param {number}　no
// @param {string}　name
// @param {number}　element	属性（App.ELEMENTS）
// @param {number}　倍率		スキル倍率
// @param {number}　GCD		共通クールダウン
// @constructor
//-----------------------------------------------
App.SkillBuilder = function(wepon, no, name, element, 倍率, GCD) {
	this.Wepon = wepon;
	this.No = no;
	this.Name = name;
	this.Element = element;
	this.スキル倍率 = 倍率;
	this.GCD = GCD;
	this.ラピス有無 = false;
	this.EXスキル = 0; // 0:EXスキル以外、1:左特化スキル、2:右特化スキル
	this.ネクロスキル = false;
	this.ExAbility = Number.NaN;
	this.設置スキル = undefined; // スキルに付属する設置スキルがある場合は Skill
	this.設置 = false;	//自分自身が設置スキルならtrue;
	this.Hit = 1;
	this.チャージスキル = undefined;
	this.フルチャージ増加会心率 = Decimal.ZERO;
	this.特化ダメージ増加率 = {
		1 : Decimal.ZERO,
		2 : Decimal.ZERO
	};
	this.攻撃DOTスキル係数 = Decimal.ZERO;
	this.攻撃DOTスキルスタック数 = Decimal.ZERO;
	this.攻撃DOTスキル倍率 = Decimal.ZERO;
	this.攻撃DOTスキル持続時間 = Decimal.ZERO;
	//聖剣：ブレイクソード、太刀：居合斬り、手裏剣：忍法・鉄火時雨の「与えるダメージを10%増加させる。」用
	this.ダメージ増加率 = Decimal.ZERO;
};
// @param {bool}　value
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.setExAbility = function(value) {
	this.ExAbility = value;
	return this;
};
// @param {bool}　value
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.setラピス = function(value) {
	this.ラピス有無 = value;
	return this;
};
// @param {bool}　value
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.setネクロスキル = function(value) {
	this.ネクロスキル = value;
	return this;
};
// @param {bool}　value
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.setEXスキル = function(value) {
	this.EXスキル = value;
	return this;
};
// @param {Skill}　value
// @param {number}　hit
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.set設置スキル = function(value, hit) {
	if(this.設置スキル) {
		// 設置スキルの多重登録は不可
		throw new Error();
	}
	value.設置 = true;
	this.設置スキル = value;
	this.設置スキル.Hit = hit;
	return this;
};
// @param {number}　ex　1: 左側、2：右側
// @param {number}　value ダメージ増加率
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.set特化ダメージ増加率 = function(ex, value) {
	this.特化ダメージ増加率[ex] = new Decimal(value);
	return this;
};
// @param {number}　value チャージ倍率（スキル欄表記値）
// @param {number}　会心率
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.setチャージスキル = function(value, 会心率) {
	会心率　= 会心率 || 0;
	if(this.チャージスキル) {
		// チャージスキルの多重登録は不可
		throw new Error();
	}
	this.チャージスキル = value;
	this.フルチャージ増加会心率 = new Decimal(会心率);
	return this;
};
// @param {bool}　value
// @param {number}　スタック数
// @param {number}　倍率
// @param {number}　持続時間
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.set攻撃DOTスキル係数 = function(value, スタック数, 倍率, 持続時間){
	this.攻撃DOTスキル係数 = new Decimal(value);
	this.攻撃DOTスキルスタック数 = new Decimal(スタック数);
	this.攻撃DOTスキル倍率 = new Decimal(倍率).div(Decimal.HUNDRED); // 10 → 0.1に
	this.攻撃DOTスキル持続時間 = new Decimal(持続時間);
	return this;
};
// @param {number}　value
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.setダメージ増加率 = function(value){
	this.ダメージ増加率 = new Decimal(value);
	return this;
};
//　Builderパターンの生成メソッド
// @return {App.SkillBuilder}
App.SkillBuilder.prototype.build = function() {
	var skill = new App.Skill(this);
	var 設置スキル = skill.設置スキル;
	if(設置スキル) {
//		if(設置スキル.EXスキル !== 0) {
//			設置スキル.EXスキル = skill.EXスキル;
//		}
		// 設置スキルは親スキルの項目を引き継ぐ
		設置スキル.チャージスキル = skill.チャージスキル;
		設置スキル.フルチャージ増加会心率 = skill.フルチャージ増加会心率;
	}
	return skill;
};
//---------------------------------------
// クラス：Skill
// @param {SkillBuilder}　builder
// @constructor
//---------------------------------------
App.Skill = function(builder) {
	this.Wepon = builder.Wepon;
	this.No = builder.No;
	var n = ("00" + this.Wepon).slice(-2) + ("00" + this.No).slice(-2);
	this.Unique = Util.parseInt(n);
	this.Name = builder.Name;
	this.Element = builder.Element;
	this.スキル倍率 = builder.スキル倍率;
	this.GCD = builder.GCD;	//共通クールダウン
	this.ラピス有無 = builder.ラピス有無;
	this.EXスキル = builder.EXスキル;
	this.ExAbility = builder.ExAbility;
	this.ネクロスキル = builder.ネクロスキル;
	//　設置
	this.設置スキル = builder.設置スキル;
	this.設置 = builder.設置;
	this.Hit = builder.Hit;
	// チャージ
	this.チャージスキル = builder.チャージスキル;
	this.フルチャージ増加会心率 = builder.フルチャージ増加会心率;
	// 特化
	this.特化ダメージ増加率 = builder.特化ダメージ増加率;
	// 攻撃5%DOT
	this.攻撃DOTスキル係数 = builder.攻撃DOTスキル係数;
	this.攻撃DOTスキルスタック数 = builder.攻撃DOTスキルスタック数;
	this.攻撃DOTスキル倍率 = builder.攻撃DOTスキル倍率;
	this.攻撃DOTスキル持続時間 = builder.攻撃DOTスキル持続時間;
	// ダメージ増加率
	this.ダメージ増加率 = builder.ダメージ増加率;
};
// @param {number}　lv
// @return {number}
App.Skill.スキル攻撃力 = function(lv) {
	// http://forum.gamer.com.tw/Co.php?bsn=24451&sn=336155
	var	基本係数 = 5 * Math.pow(lv, 2) + 150;
	return new Decimal(基本係数).times(0.78).round().toNumber();
};
// @param {object}　params
// @return {object.<Decimal>} 
App.Skill.スキルダメージ = function(params) {
	// 表記スキルダメージ　クライアントの表記スキルダメージ
	// 実スキルダメージ　チャージスキル考慮のスキルダメージ（計算に使用）
	var result = {
		表記 : params.攻撃力,
		実 : params.攻撃力
	};
	var スキル = params.スキル;
	if(スキル.is通常攻撃()) {
		// 通常攻撃はステータスの攻撃力をそのまま格納
		return result;
	}
	// 表記スキルダメージ：(ステータス攻撃力 + スキル攻撃力)*スキル倍率 + ラピス
	//　スキル倍率： (基礎スキル倍率/100) + (チャージ増加値/100)
	var damage = params.攻撃力.plus(App.Skill.スキル攻撃力(params.スキルLV));
	var 倍率 = new Decimal(スキル.スキル倍率).div(Decimal.HUNDRED);
	var チャージ倍率 = 倍率;
	// フルチャージ
	if (params.チャージ率 == App.CHARGE_TYPE['100']) {
		チャージ倍率 = 倍率.plus(new Decimal(スキル.チャージスキル).div(Decimal.HUNDRED));
	}
	// 表記と実スキルダメージに同じ切捨て処理を行っているが、同じ切捨て処理を行っているかは未検証
	result.表記 = Util.ROUND_HALF_DOWN(damage.times(倍率)).plus(params.ラピス);
	result.実 = Util.ROUND_HALF_DOWN(damage.times(チャージ倍率)).plus(params.ラピス);
	return result;
};
// @param {object}　params
// @return {Decimal} 
App.Skill.DOT初期ダメージ = function(params) {
	return new Decimal(Math.pow(params.スキルLV, 2) + 30).times(params.スキル.攻撃DOTスキル係数);
};
// @return {bool}
App.Skill.prototype.is通常攻撃 = function() {
	return this.Wepon === 0;
};
// @return {bool}
App.Skill.prototype.isEXスキル = function() {
	return this.EXスキル !== 0;
};
// @return {bool}
App.Skill.prototype.isATKDOT = function() {
	return !Decimal.ZERO.eq(this.攻撃DOTスキル係数);
};
// @param {number}　element
// @return {bool}
App.Skill.prototype.属性一致 = function(element) {
	return this.Element !== App.ELEMENTS.無 && this.Element == element;
};
// @return {bool}
App.Skill.prototype.isSkillLV編集可 = function() {
	return !this.is通常攻撃() && !this.isEXスキル() && !this.ネクロスキル;
};
// @return {bool}
App.Skill.prototype.isチャージ編集可 = function() {
	return this.チャージスキル !== undefined;
};
// @param {number}　ChargeType
// @return {Decimal}
App.Skill.prototype.フルチャージ会心率 = function(ChargeType) {
	ChargeType = ChargeType || App.CHARGE_TYPE['無'];
	if(ChargeType === App.CHARGE_TYPE['100']) {
		return this.フルチャージ増加会心率;		
	}else {
		return Decimal.ZERO;
	}
};
// @return {bool}
App.Skill.prototype.isExAbility編集可 = function() {
	return !this.is通常攻撃() && !this.isEXスキル() && !this.ネクロスキル;
};
// スキルに対応するラピスが存在する場合はtrue
// @return {bool}
App.Skill.prototype.isラピス = function() {
	return this.ラピス有無;
};
// URLのパラメータに含めるスキルを判定
// @return {bool}
App.Skill.prototype.isExport = function() {
	if(this.ネクロスキル || this.設置) {
		return false;
	}
	if(this.isEXスキル()) {
		return this.isチャージ編集可();
	}
	return true;
};
// ツールチップ文字列を取得
// @return {string}
App.Skill.prototype.getToolTip = function() {
	if(this.is通常攻撃()) {
		return this.Name;
	}
	if(this.設置) {
		return '[設置]' + this.Name + '<br/>スキル倍率：' + this.スキル倍率 + '%';
	}else {
		return this.Name + '<br/>スキル倍率：' + this.スキル倍率 + '%';
	}
};

App.SkillTable = [
	new App.SkillBuilder(0, 0, '通常攻撃', 0, 100, 0.5).build(),
	//【シールドソード】
	new App.SkillBuilder(App.WEPONS.シールドソード, 0, 'ソードスラッシュ', 0, 140, 1).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.シールドソード, 1, 'シールドストライク', 0, 180, 0.9).setラピス(true).build(),
	//　2:シールドブレス
	new App.SkillBuilder(App.WEPONS.シールドソード, 3, 'ラッシュインパクト', 4, 115, 0.8).setExAbility(8).setラピス(true).build(),
	//　4:リフレクション
	new App.SkillBuilder(App.WEPONS.シールドソード, 5, 'ライトニングブロー', 3, 130, 1)
		.set特化ダメージ増加率(2, 15).setExAbility(8).setラピス(true).build(),
	//　6:プロテクションシールド
	new App.SkillBuilder(App.WEPONS.シールドソード, 7, 'スケアードロア', 0, 120, 0.9).build(),
	//　8:ヴェンジェンス
	//　20:戦神の守護　左特化
	new App.SkillBuilder(App.WEPONS.シールドソード, 21, 'ジャッジメント', 0, 190, 1.2).setEXスキル(2).build(),//右特化
	//【バトルアックス】
	new App.SkillBuilder(App.WEPONS.バトルアックス, 0, 'ドゥームクラッシュ', 0, 105, 0.8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.バトルアックス, 1, 'スイングスラッシュ', 0, 175, 1.5).set特化ダメージ増加率(1, 8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.バトルアックス, 2, 'アースクエイク', 0, 150, 0.6)
		.set特化ダメージ増加率(2, 7).setExAbility(3).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.バトルアックス, 3, 'ダーティーブリング', 6, 95, 1).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.バトルアックス, 4, 'フレイムレイジ', 1, 100, 1)
		.set特化ダメージ増加率(1, 15).setExAbility(8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.バトルアックス, 5, 'ホイールウィンド', 4, 35, 1).build(),
	new App.SkillBuilder(App.WEPONS.バトルアックス, 6, 'グランドソウル', 0, 90, 1.8).set特化ダメージ増加率(2, 20).build(),
	//　7:アースエナジー
	new App.SkillBuilder(App.WEPONS.バトルアックス, 20, 'スラッシュストライク', 0, 185, 0.9).setEXスキル(1).build(),//左特化
	new App.SkillBuilder(App.WEPONS.バトルアックス, 21, 'ヘビースラッシュ', 0, 170, 0.6).setEXスキル(2).build(),//右特化
	//【ツインソード】
	new App.SkillBuilder(App.WEPONS.ツインソード, 0, 'シャープエッジ', 0, 140, 1.1).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ツインソード, 1, 'クロススラッシュ', 0, 130, 1.2)
		.set攻撃DOTスキル係数(1.2185, 3, 10, 12).setExAbility(3).setラピス(true).build(),
	//　2:スピードフリップ
	new App.SkillBuilder(App.WEPONS.ツインソード, 3, 'フォーリングスノー', 2, 132, 0.7).setExAbility(8).setラピス(true).build(),
	//　4:ライトニングレイジ
	new App.SkillBuilder(App.WEPONS.ツインソード, 5, 'ダンシングフェイド', 0, 135, 1.1).set特化ダメージ増加率(1, 20).build(),
	new App.SkillBuilder(App.WEPONS.ツインソード, 6, 'デュアルチェイン', 0, 190, 1.1)
		.set攻撃DOTスキル係数(0.4875, 3, 10, 10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ツインソード, 7, 'バタフライエッジ', 5, 150, 2)
		.set特化ダメージ増加率(1, 20).setExAbility(6).setラピス(true).build(),
	//　8:アサシネーション
	new App.SkillBuilder(App.WEPONS.ツインソード, 20, 'ブラッデイデッドリィ', 0, 205, 1).setEXスキル(1).build(),//左特化
	new App.SkillBuilder(App.WEPONS.ツインソード, 21, 'ポイズンイリュージョン', 0, 160, 1.2).setEXスキル(2).build(),//右特化
	//【ダブルガン】
	new App.SkillBuilder(App.WEPONS.ダブルガン, 0, 'アライメントショット', 0, 135, 0.8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダブルガン, 1, 'クイックショット', 0, 155, 1).setExAbility(5).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダブルガン, 2, 'ソニックインパクト', 4, 145, 0.8).setExAbility(5).setラピス(true)
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.ダブルガン, 32, 'ソニックツイスト', 4, 35).setEXスキル(1).build(), 6).build(),// 設置スキル
	//　3:アイストラップ
	//　4:ダークトラップ
	//　5:チャームショット
	new App.SkillBuilder(App.WEPONS.ダブルガン, 6, 'ライトニングショット', 3, 170, 1.8)
		.set特化ダメージ増加率(1, 15).setExAbility(5).setラピス(true).build(),
	//　7:コンセントレイト
	new App.SkillBuilder(App.WEPONS.ダブルガン, 20, 'スパイラルショット', 0, 195, 1.2).setEXスキル(1).build(), //左特化
	new App.SkillBuilder(App.WEPONS.ダブルガン, 21, 'ケーヴトラップ', 0, 165, 1).setEXスキル(2).build(), //右特化
	//【キャノン】
	new App.SkillBuilder(App.WEPONS.キャノン, 0, 'クラッシュインパクト', 0, 103, 0.8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.キャノン, 1, 'インフェルノキャノン', 1, 108, 0.5).setExAbility(8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.キャノン, 2, 'エレクトロ', 3, 120, 1.4).set特化ダメージ増加率(1, 20).setExAbility(8).setラピス(true).build(),
	//　3:タレットガン
	new App.SkillBuilder(App.WEPONS.キャノン, 4, 'フリージングキャノン', 2, 115, 0.5).setExAbility(10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.キャノン, 5, 'メテオキャノン', 5, 140, 1.3).set特化ダメージ増加率(1, 10).setラピス(true).build(),
	//　6:ヒーリングクリスタル
	//　7:フォースカバー
	new App.SkillBuilder(App.WEPONS.キャノン, 20, 'ネメシスレーザー', 0, 165, 0.9)
		.setEXスキル(1).setチャージスキル(120).build(), //左特化
	//　21:シャルフリヒター　右特化
	//【ハープ】
	new App.SkillBuilder(App.WEPONS.ハープ, 0, 'ストームノイズ', 4, 105, 0.6).set特化ダメージ増加率(2, 20).setExAbility(8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ハープ, 1, 'ヘブンリーサウンド', 5, 125, 0.8)
		.set特化ダメージ増加率(2, 15).setExAbility(8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ハープ, 2, 'ヒーリングノート', 0, 30, 0.7).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ハープ, 3, 'エレキロック', 3, 140, 1).setラピス(true).build(),
	//　4:リトルラブソング
	new App.SkillBuilder(App.WEPONS.ハープ, 5, 'リカバリーリズム', 0, 12, 1.3).setExAbility(5).build(),
	new App.SkillBuilder(App.WEPONS.ハープ, 6, 'ライトメロディ', 0, 13, 0.8).setExAbility(3).setラピス(true).build(),
	//　7:ラプソディ
	//　20:ヘブンバード　左特化
	new App.SkillBuilder(App.WEPONS.ハープ, 21, 'パニッシュストリング', 0, 175, 0.9)
		.setEXスキル(2).setチャージスキル(150).build(),//右特化
	//【ロッド】
	new App.SkillBuilder(App.WEPONS.ロッド, 0, 'ファイアブレイズ', 1, 100, 0.8).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ロッド, 1, 'フロストボルト', 2, 90, 0.8).setラピス(true).build(),
	//　2：エレメントキャスティング
	new App.SkillBuilder(App.WEPONS.ロッド, 3, 'アイスストーム', 2, 85, 0.8).setExAbility(10).setラピス(true)
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.ロッド, 33, 'フロストエリア', 2, 40).setEXスキル(1).build(), 6).build(),// 設置スキル
	//　4：エリアルコート
	new App.SkillBuilder(App.WEPONS.ロッド, 5, 'ハリケーン', 4, 120, 0.8).setExAbility(5).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ロッド, 6, 'バーニングメテオ', 1, 140, 1.2)
		.setチャージスキル(120, 0).set特化ダメージ増加率(2, 6).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ロッド, 7, 'ライトニングノヴァ', 3, 105, 1).setExAbility(10).build(),
	//　8:エクスプローション
	new App.SkillBuilder(App.WEPONS.ロッド, 20, 'エレメントフラッシュ', 0, 165, 1.1).setEXスキル(1).build(), //左特化
	new App.SkillBuilder(App.WEPONS.ロッド, 21, 'デストロイライト', 0, 155, 1.2).setEXスキル(2).build(), //右特化
	
	// グリモワール
	new App.SkillBuilder(App.WEPONS.グリモワール, 0, 'ヴァンパイアリック', 6, 135, 1)
		.set特化ダメージ増加率(1, 8).setExAbility(5).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.グリモワール, 1, 'カオスディスコード', 0, 95, 1.1).set攻撃DOTスキル係数(0.3412, 1, 10, 12).setラピス(true).build(),
	//　2：ネクロスペル
	new App.SkillBuilder(App.WEPONS.グリモワール, 3, 'アビスグルーム', 6, 120, 0.8).setExAbility(10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.グリモワール, 4, 'ブラッディマーク', 0, 100, 1.1).set攻撃DOTスキル係数(0.4875, 1, 10, 12).build(),
	//　5：リバース
	new App.SkillBuilder(App.WEPONS.グリモワール, 6, 'フレイムインパクト', 1, 135, 1.4).setExAbility(8).setラピス(true).build(),
	//　7：サモンナイトメアサイン
	//　8：アルケインパワー
	new App.SkillBuilder(App.WEPONS.グリモワール, 10, 'ネクロ・ヴァンパイアリック', 6, 162, 1).setネクロスキル(true).build(),
	new App.SkillBuilder(App.WEPONS.グリモワール, 11, 'ネクロ・カオスディスコード', 0, 114, 1.1)
		.setネクロスキル(true).set攻撃DOTスキル係数(1.2187, 1, 10, 12).build(),
	new App.SkillBuilder(App.WEPONS.グリモワール, 13, 'ネクロ・アビスグルーム', 6, 168, 0.8).setネクロスキル(true).build(),
	new App.SkillBuilder(App.WEPONS.グリモワール, 16, 'ネクロ・フレイムインパクト', 1, 182, 1.4).setネクロスキル(true).build(),
	new App.SkillBuilder(App.WEPONS.グリモワール, 20, 'カオスエレメント', 0, 120, 1.3).setEXスキル(1)	//左特化
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.グリモワール, 50, '邪鬼の吐息', 0, 50).setEXスキル(1).build(), 16).build(),// 設置スキル
	new App.SkillBuilder(App.WEPONS.グリモワール, 21, 'イーブルテリトリー', 0, 145, 0.1).setEXスキル(2).build(), //右特化
	//【ダガー】
	new App.SkillBuilder(App.WEPONS.ダガー, 0, 'スイフトアタック', 4, 145, 1.5).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダガー, 1, 'スラストブレイク', 0, 130, 0.6).set特化ダメージ増加率(1, 25).build(),
	new App.SkillBuilder(App.WEPONS.ダガー, 2, 'スピリット', 0, 8, 1).setExAbility(4).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダガー, 3, 'グランドスパーク', 3, 135, 1.3).setExAbility(5).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダガー, 4, 'ストライクオブウォリア', 0, 225, 1.1).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダガー, 5, 'ブレイズラッシュ', 1, 155, 1.7).set特化ダメージ増加率(2, 10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.ダガー, 6, 'ミスルトゥシャドウ', 6, 125, 1.7).build(),
	//　7:アナトミーコンストラクション
	new App.SkillBuilder(App.WEPONS.ダガー, 20, 'マッドロータス', 0, 135, 0.1).setEXスキル(1).build(),	//左特化
	//　21：トルネードステップ　右特化
	//【アークス】
	new App.SkillBuilder(App.WEPONS.アークス, 0, 'トリプルシュート', 0, 100, 0.9).setチャージスキル(120, 20).set特化ダメージ増加率(1, 15).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.アークス, 1, 'フリーズオルビット', 2, 90, 0.6).setチャージスキル(120, 20).build(),
	new App.SkillBuilder(App.WEPONS.アークス, 2, 'ディメンションシュート', 6, 115, 0.8).setチャージスキル(120, 20 + 30).setラピス(true)
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.アークス, 32, 'ディメンションシュート', 6, 115).setEXスキル(2).build(), 4).build(),// 設置スキル
	//　3:アンゼム
	new App.SkillBuilder(App.WEPONS.アークス, 4, 'ポイズンシュート', 0, 95, 0.6).setチャージスキル(120, 20).set特化ダメージ増加率(1, 20).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.アークス, 5, 'ウィングホーク', 5, 140, 1.1).setチャージスキル(120, 20).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.アークス, 6, 'ジェノサイドレイン', 0, 125, 0.9).setチャージスキル(120, 20).setラピス(true).build(),
	//　7:クロックアップ
	new App.SkillBuilder(App.WEPONS.アークス, 20, 'ハイウイングショット', 0, 120, 0.1).setEXスキル(1).build(),//左特化
	new App.SkillBuilder(App.WEPONS.アークス, 21, 'レインボーシャイン', 0, 145, 0.7).setEXスキル(2).setチャージスキル(120, 20)//右特化
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.アークス, 51, 'レインボーシャイン', 0, 25).setEXスキル(2).build(), 9).build(),// 設置スキル
	//【太刀】
	new App.SkillBuilder(App.WEPONS.太刀, 0, '舞翔一閃・宵桜', 0, 125, 0.7).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.太刀, 1, '九曜一閃・飛燕', 4, 120, 0.9).set特化ダメージ増加率(1, 12).setラピス(true).set設置スキル(
		new App.SkillBuilder(App.WEPONS.太刀, 31, '九曜一閃・飛燕', 4, 100).setEXスキル(1).build(), 2).build(),// 設置スキル
	//　2:絶・滅魂抜刀牙
	new App.SkillBuilder(App.WEPONS.太刀, 3, '奥義・乱舞鬼百合', 0, 70, 0.1).set特化ダメージ増加率(1, 25 + 10).set特化ダメージ増加率(2, 10).build(),
	new App.SkillBuilder(App.WEPONS.太刀, 4, '輪廻無双', 6, 110, 0.7).build(),
	new App.SkillBuilder(App.WEPONS.太刀, 5, '居合斬り', 0, 160, 0.9)
		.setチャージスキル(80).setダメージ増加率(10).set特化ダメージ増加率(1, 10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.太刀, 6, '紅蓮龍斬・鏡花', 1, 150, 0.9).set特化ダメージ増加率(2, 12).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.太刀, 7, '千本夜桜・鳴神', 0, 185, 1.3).setラピス(true).build(),
	//　8:森羅の闘志
	new App.SkillBuilder(App.WEPONS.太刀, 20, '一の太刀', 0, 175, 1).setEXスキル(1).build(), //左特化
	new App.SkillBuilder(App.WEPONS.太刀, 21, '一刀流・秘儀', 0, 215, 0.6).setEXスキル(2).build(), //右特化
	//【サイズ】
	new App.SkillBuilder(App.WEPONS.サイズ, 0, 'ソウルヘイトリッド', 0, 90, 0.6).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.サイズ, 1, 'ディサピアランス', 1, 100, 0.9).setラピス(true).build(),
	//　2:サモンファミリア
	//　3:ファミリアコントロール
	new App.SkillBuilder(App.WEPONS.サイズ, 4, 'プリズングラキエス', 2, 80, 0.8).setラピス(true).build(),
	//　5:サタンネブラ
	new App.SkillBuilder(App.WEPONS.サイズ, 6, 'ヘルアンドラス', 0, 85, 0.1).set攻撃DOTスキル係数(0.5850, 4, 10, 12).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.サイズ, 7, 'ゴーストシャウト', 6, 130, 1.1).setラピス(true).build(),
	//　8:ブレスオブサタン
	new App.SkillBuilder(App.WEPONS.サイズ, 20, 'グラッジアタック', 6, 150, 1.1)
		.set攻撃DOTスキル係数(0.9750, 1, 5, 12).setEXスキル(1).build(),//左特化
	//　21:ブラッディスペル　右特化
	//【聖剣】
	new App.SkillBuilder(App.WEPONS.聖剣, 0, 'アースブレイク', 0, 110, 0.9).setチャージスキル(150, 20).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.聖剣, 1, 'ドラゴンスラッシュ', 0, 130, 0.7)
		.setExAbility(5).setチャージスキル(150).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.聖剣, 2, '聖裁', 0, 155, 0.8)
		.setチャージスキル(150).set特化ダメージ増加率(1, 7).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.聖剣, 3, 'フリジッドブラスト', 2, 120, 0.9)
		.setチャージスキル(150).set特化ダメージ増加率(2, 12).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.聖剣, 4, 'ブレイクソード', 5, 170, 1.1)
		.setチャージスキル(100).setダメージ増加率(10).setExAbility(10).setラピス(true)
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.聖剣, 34, '聖炎', 5, 30).setダメージ増加率(10).build(), 6).build(),// 設置スキル
	//　5:覚醒
	new App.SkillBuilder(App.WEPONS.聖剣, 6, 'ホーリースラッシュ', 3, 160, 0.7)
		.setチャージスキル(150).set特化ダメージ増加率(1, 12).setExAbility(8).build(),
	//　7:一心一意
	new App.SkillBuilder(App.WEPONS.聖剣, 20, '滅魔斬', 0, 190, 1).setEXスキル(1).build(),//左特化
	new App.SkillBuilder(App.WEPONS.聖剣, 21, 'ディテンション', 0, 150, 1).setチャージスキル(150).setEXスキル(2).build(),//右特化
	//【手裏剣】
	new App.SkillBuilder(App.WEPONS.手裏剣, 0, '翔疾風', 0, 105, 0.9).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.手裏剣, 1, '大車輪・紅葉', 0, 120, 0.9).set特化ダメージ増加率(1, 12).setExAbility(10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.手裏剣, 2, '忍法・影剣', 0, 125, 0.9).set特化ダメージ増加率(2, 15).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.手裏剣, 3, '忍法・鉄火時雨', 0, 135, 0.7).setチャージスキル(120).setダメージ増加率(10).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.手裏剣, 4, '隠遁・裏鋼', 6, 143, 1).setラピス(true).build(),
	new App.SkillBuilder(App.WEPONS.手裏剣, 5, '風遁・旋風鎌鼬', 4, 150, 0.7).set特化ダメージ増加率(2, 10).setExAbility(8)
	.set設置スキル(
		new App.SkillBuilder(App.WEPONS.手裏剣, 35, '風遁・旋風鎌鼬', 4, 40).build(), 15).build(),// 設置スキル
	new App.SkillBuilder(App.WEPONS.手裏剣, 6, '火遁・火竜礫', 1, 195, 0.9).set特化ダメージ増加率(1, 16).build(),
	//　7:奥伝・五行結印
	new App.SkillBuilder(App.WEPONS.手裏剣, 20, '口寄せ・狂獣卑牙', 0, 165, 1).setEXスキル(1).build() //左特化
	//　21:陰遁・影襲陣　右特化
];
// @param {string}　key
// @return {Skill} 存在しない場合、undefined
App.SkillTable.Search = function(key) {
	var skill = App.SkillTable.filter(function(element) {
		if (element.Unique === key) {
			return element;
		}
	})[0];
	return skill;
};
//-----------------------------------------------
//　クラス：SkillAttribute
// @constructor
// @pattern FlyWeight
//-----------------------------------------------
App.Skill.Attribute = function(スキルLV編集可, ラピス編集可) {
	this.スキルLV編集可 = スキルLV編集可
	this.ラピス編集可 = ラピス編集可;
};
//-----------------------------------------------
// クラス：防御ステータス
// @constructor
// @param {number} value
//-----------------------------------------------
App.防御ステータス = function(value) {
	var lv = new Decimal(value);
	// 非整数値の時
	if(!lv.isInt()) {
		throw new Error();
	}
	this.LV = lv.toNumber();
	this.変換係数 = 5 * Math.pow(this.LV, 2) + 150;
	// 変換係数の75%（小数点以下：切捨て）
	this.基準防御力 = new Decimal(this.変換係数).times(0.75).floor().toNumber();
};
// @param {number} 攻撃側レベル
// @param {number} 防御側レベル
// @return {number}
App.防御ステータス.変換係数LV75 = function(攻撃側レベル, 防御側レベル) {
	var min = Math.min(攻撃側レベル, 防御側レベル);
	if (isNaN(min)) {
		throw new Error();
	}
	//　変換係数のLVキャップ設定
	if (min >= App.LV75) {
		return 28000;
	}else {
		var 低い方 = new App.防御ステータス(min);
		return 低い方.変換係数;
	}
};
//-----------------------------------------------
// クラス：レベル差補正
// @constructor
// @param {decimal} 攻撃側レベル
// @param {decimal} 防御側レベル
//-----------------------------------------------
App.レベル差補正 = function(攻撃側レベル, 防御側レベル) {
	// decimal→numberに型変換
	this.攻撃側レベル = 攻撃側レベル.toNumber();
	this.防御側レベル = 防御側レベル.toNumber();
	this.LV差 = 攻撃側レベル.minus(防御側レベル).toNumber();
	// 自キャラ → 防御側の補正は+40LVまで
	this.LV差 = Math.min(this.LV差, 40);
	this.補正係数 = Decimal.ONE.plus(new Decimal(this.LV差).times(0.02));
	this.防御側 = new App.防御ステータス(this.防御側レベル);
};
//-----------------------------------------------
// メソッド定義
//-----------------------------------------------
// @return {bool}
App.レベル差補正.prototype.is会心率補正 = function() {
	return this.LV差 > 7;
};
// @return {number}
App.レベル差補正.prototype.会心率補正 = function() {
	// 会心率補正にLV差40のキャップがあるかは未検証
	return (this.LV差 - 7) * 2;
};
// @return {decimal}
App.レベル差補正.prototype.レベル差補正係数 = function() {
	return this.補正係数;
};
// @return {number}
App.レベル差補正.prototype.変換係数 = function() {
	return App.防御ステータス.変換係数LV75(this.攻撃側レベル, this.防御側レベル);
};
//---------------------------------------
// クラス：防御力
// @constructor
// @param {レベル差補正} レベル差補正
//---------------------------------------
App.防御力 = function(レベル差補正) {
	// 参照を保持
	this.レベル差補正 = レベル差補正;
	this.基準防御力 = this.レベル差補正.防御側.基準防御力;
	this.変換係数 = this.レベル差補正.変換係数();
	this.敵防御上昇バフ = Decimal.ZERO;	// 防御%上昇
	this.破防減少 = Decimal.ZERO;	// 防御%減少
	this.防御固定値減少 = Decimal.ZERO;
	this.実防御率 = Number.NaN;
};
//---------------------------------------
// クラスメソッド
//---------------------------------------
// @param {decimal} value	数値
// @return {string}	防御率の制限　0～0.80
App.防御力.防御率キャップ = function(value) {
	value = Decimal.max(value, 0);
	value = Decimal.min(value, 0.80);
	return value;
};
//---------------------------------------
// 防御力のメソッド定義
//---------------------------------------
// @return {decimal}
App.防御力.prototype.破防減少率 = function() {
	// 1 + 防御%上昇(%) - 破防率(%)
	return Decimal.ONE
		.plus(this.敵防御上昇バフ.div(Decimal.HUNDRED))
		.minus(this.破防減少.div(Decimal.HUNDRED));
};
	
// @return {decimal} 最大80％
App.防御力.prototype.防御率 = function() {
	if (!isNaN(this.実防御率)) {
		// 計算済みの場合はキャッシュ値を返す。
		return this.実防御率;
	}
	var aa = new Decimal(this.基準防御力).times(this.破防減少率()).minus(this.防御固定値減少);
	var bb = new Decimal(this.変換係数).times(0.75).floor();
	if(aa.comparedTo(bb) === 0) {
		this.実防御率 = new Decimal(0.75);
		return this.実防御率;
	}
	var ee = new Decimal(0.02);
	var gg = Decimal.ONE;
	var hh = Decimal.ZERO;
	// 式：aa > bb 　暗黙の型変換を抑止するため、comparedToメソッドを使用
	if(aa.comparedTo(bb) === 1) {
		ee = new Decimal(0.07);
		gg = new Decimal(3.5);
		hh = new Decimal(1.875);
	}

	var cc = aa.div(this.変換係数);
	var dd = new Decimal(0.015).times(this.レベル差補正.LV差).times(gg);
	var ff = cc.plus(hh).plus(dd);
	var zz = ee.times(new Decimal(this.レベル差補正.LV差).plus(50));
	var ccc = ff.div(zz);
	ccc = ccc.toDecimalPlaces(5);
	this.実防御率 = App.防御力.防御率キャップ(ccc);
	return this.実防御率;
};
// @return {string}
App.防御力.prototype.デバフ後防御率 = function() {
	return new Decimal(this.防御率()).times(Decimal.HUNDRED).toFixed(3);
};
// @return {string}
App.防御力.prototype.係数 = function() {
	// http://millaise.blog.fc2.com/blog-entry-179.html
	// 防御 最大80%
	var defenseRate = this.防御率();
	// Lv差によるダメージ補正
	var cc = this.レベル差補正.レベル差補正係数();
	return Decimal.ONE.minus(defenseRate).times(cc).toString();
};
// @return {string}
App.防御力.prototype.hashCode = function() {
	return 0;
};
//---------------------------------------
// クラス：Pair
// @constructor
//---------------------------------------
App.Pair = function() {
	this.Keys = [];
	this.Items = [];
	// add関数以外を定義した場合は、lengthプロパティも更新する必要あり！
	this.length = 0;
};
//---------------------------------------
// クラス：Pairのメソッド定義
//---------------------------------------
// @param {object} key
// @param {object} value
App.Pair.prototype.add = function(key, value) {
	this.Keys[key] = value;
	this.Items.push(value);
	this.length++;
	return this;
};
// @param {object} key
// @return {object}
App.Pair.prototype.ItemName = function(key) {
	return this.Keys[key];
};
App.Pair.prototype.Clear = function() {
	this.Keys = [];
	this.Items = [];
	this.length = 0;
	return this;
};
//---------------------------------------
// クラス：KeyValuePair
// @constructor
// @param {object} key
// @param {object} value
// @param {number} DataType
//---------------------------------------
App.KeyValuePair = function(key, value, DataType) {
	this.Key = key;
	this.Value = value;
	this.DataType = DataType || 0;
};
//-----------------------------------------------
// クラス：Calc
// 概要：UIクラスから呼び出され、ダメージ計算処理を行う。
// @constructor
//-----------------------------------------------
App.Calc = function Calc() {
	this.Cash防御 = undefined;
};
//-----------------------------------------------
// メソッド定義
//-----------------------------------------------

// パラメータを受け取り防御クラスを返す。
// @param {object} params
// @return {防御力}
//-----------------------------------------------
App.Calc.prototype.createDefence = function(params) {
	var レベル差 = new App.レベル差補正(params.キャラレベル, params.敵レベル);
	var 防御 = new App.防御力(レベル差);
	防御.敵防御上昇バフ = params.敵防御上昇バフ;
	防御.破防減少 = params.破防率;
	防御.防御固定値減少 = params.固定値防御減少;
	return 防御;
};
//-----------------------------------------------
// ダメージ係数を算出：攻撃側
// @param {object} params
// @param {object} damage out
//-----------------------------------------------
App.Calc.prototype.DamageAttack = function(params, damage) {

	damage['メイン武器ダメージ増加係数'] = Decimal.ONE.plus(params.メイン武器ダメ増加.div(Decimal.HUNDRED));
	damage['特定スキルダメージ増加係数'] = Decimal.ONE.plus(params.特定スキルダメージ増加率.div(Decimal.HUNDRED));

	//属性計算
	var 属性スキルダメージ増加係数 = Decimal.ONE;
	var skill = params.スキル;
	if(skill.属性一致(params.属性一致武器)) {
		属性スキルダメージ増加係数 = 属性スキルダメージ増加係数.plus(App.ELEMENT_WEAPON);
	}
	if(skill.属性一致(params.ボスの属性)) {
		属性スキルダメージ増加係数 = 属性スキルダメージ増加係数.minus(App.ELEMENT_BODY);
	}
	if(skill.属性一致(params.属性スキル)) {
		属性スキルダメージ増加係数 = 属性スキルダメージ増加係数.plus(params.属性スキルダメージ増加率.div(Decimal.HUNDRED));
	}
	damage['属性スキルダメージ増加係数'] = 属性スキルダメージ増加係数;

	damage['XX属性の敵へダメージ増加係数'] = Decimal.ONE.plus(params.XX属性の敵へダメージ増加率.div(Decimal.HUNDRED));
};
//-----------------------------------------------
// ダメージ係数を算出：ダンジョン
// @param {object} params
// @param {object} damage out
//-----------------------------------------------
App.Calc.prototype.DamageDungeon = function(params, damage) {
	var skill = params.スキル;
	damage['IDダメージ減算係数'] = Decimal.ONE
				.minus(params.IDダメージ減算.div(Decimal.HUNDRED))
				.plus(skill.ダメージ増加率.plus(params.ボスダメ増加).div(Decimal.HUNDRED));
	damage['特殊ダメージ減算係数'] = Decimal.ONE.minus(params.特殊ダメージ減算.div(Decimal.HUNDRED));
	var 靱性ダメージ減算係数 = params.靱性ダメージ減算;
	if(!靱性ダメージ減算係数.isZero()) {
		damage['靱性ダメージ減算係数'] = Decimal.ONE.minus(靱性ダメージ減算係数.minus(params.貫通力).div(Decimal.HUNDRED));
	}
};
//-----------------------------------------------
// ダメージ係数を算出：攻撃5%DOT
// @param {object} params
// @param {object} damage
// @return {decimal}
//-----------------------------------------------
App.Calc.prototype.DamageATK_DOT = function(params, damage) {
	var skill = params.スキル;
	if(!skill.isATKDOT()) {
		return Decimal.ZERO;
	}
	var dot = [];
	// http://forum.gamer.com.tw/Co.php?bsn=24451&sn=320199
	// 攻撃力 *（スキル:5% ＋ 基礎アビ:5%）
	dot['DOTスキルダメージ'] = params.攻撃力.times(skill.攻撃DOTスキル倍率);
	dot['IDダメージ減算係数'] = damage['IDダメージ減算係数'];
	dot['特殊ダメージ減算係数'] = damage['特殊ダメージ減算係数'];
	dot['メイン武器ダメージ増加係数'] = damage['メイン武器ダメージ増加係数'];
	dot['防御係数'] = damage['防御係数'];
	dot['受けるダメージ増加率'] = damage['受けるダメージ増加率'];
	var 靱性ダメージ減算係数 = params.靱性ダメージ減算;
	var 持続ダメージ増加率 = Decimal.ONE;
	if(params.武器特化.toNumber() === 1) { // 特化：左側
		// 武器：サイズ　スキル：ヘルアンドラス
		if (skill.Unique === 1206) {
			持続ダメージ増加率 = new Decimal(1.08);
			//持続ダメージ増加率 = new Decimal(1.06);
		}
	}else if(params.武器特化.toNumber() === 2) { // 武器特化：右側
		// 武器：ツインソード　スキル：クロススラッシュ、デュアルチェイン
		if(skill.Unique === 301 || skill.Unique === 306) {
			持続ダメージ増加率 = new Decimal(1.04);
		}else if(skill.Unique === 801 || skill.Unique === 804) {
			// 武器：グリモワール　スキル：カオスディスコード、ブラッディマーク
			持続ダメージ増加率 = new Decimal(1.05);
		}
	}
	var ダメージ = App.Skill.DOT初期ダメージ(params).plus(Util.summaryProduct(dot));
					
	ダメージ = ダメージ.times(App.DOT_ATK_COEFFICIENT) // 攻撃ステータスポイント補正値
					.times(持続ダメージ増加率)
					.times(1); // スタック数
	
	if(!靱性ダメージ減算係数.isZero()) {
		ダメージ = ダメージ.times(damage['靱性ダメージ減算係数']);
	}
	return ダメージ;
};
//-----------------------------------------------
// 会心ダメージと期待値を計算する。
// @param {object} params
// @param {decimal} 非会心ダメージ
// @param {decimal} 補正後会心率
// @return {object.<decimal>}
//-----------------------------------------------
App.Calc.prototype.calcCritical = function(params, 非会心ダメージ, 補正後会心率) {
	var 会心ダメージ増加率 =　new Decimal(params.会心ダメージ増加率).div(Decimal.HUNDRED);
	var 会心ダメージ = 非会心ダメージ.times(会心ダメージ増加率);
	var 非会心率 = Decimal.HUNDRED.minus(補正後会心率);
	var 期待値 = 非会心ダメージ.times(非会心率.div(Decimal.HUNDRED)).plus(会心ダメージ.times(補正後会心率.div(Decimal.HUNDRED)));
	var result = {
		会心 : 会心ダメージ,
		非会心 : 非会心ダメージ,
		期待値 : 期待値
	};
	return result;
};
//-----------------------------------------------
//　メソッドが長くなっているのでどーにかする！。
// ダメージ計算処理
// @param {object} params
// @param {object} result out
//-----------------------------------------------
App.Calc.prototype.calc = function(params, result) {
	result.表記スキルダメージ = App.Skill.スキルダメージ(params).表記;
	var 補正後会心率 = params.会心率.plus(params.スキル.フルチャージ会心率(params.チャージ率)); 
	補正後会心率 = Decimal.min(補正後会心率, Decimal.HUNDRED);
	
	var damage = [];
	damage['スキルダメージ'] = App.Skill.スキルダメージ(params).実;
	// 攻撃側
	this.DamageAttack(params, damage);
	// ダンジョン
	this.DamageDungeon(params, damage);

	//LV差補正計算　＆　防御値計算
	var 防御 = this.createDefence(params);
	// 防御#係数は文字列
	damage['防御係数'] = 防御.係数();

	//LV補正計算(会心率)
	if(防御.レベル差補正.is会心率補正()) {
		補正後会心率 = 補正後会心率.plus(防御.レベル差補正.会心率補正());
		// 補正後会心率が100％を越える時は100%に設定
		補正後会心率 = Decimal.min(補正後会心率, Decimal.HUNDRED);
	}
	// グリモワールの基礎アビリティ：受けダメ増加
	damage['受けるダメージ増加率'] = Decimal.ONE;
	if(params.武器 == App.WEPONS.グリモワール) {
		damage['受けるダメージ増加率'] = Decimal.ONE.plus(0.03);
	}
	// 
	var 攻撃DOT = this.DamageATK_DOT(params, damage);
	// ダメージ係数を乗算。
	// 非会心ダメージは小数点つき。画面表示のための小数点以下の切捨てタイミングを考える！
	var 非会心ダメージ = Util.summaryProduct(damage);
	// オブジェクトをマージしてデバック出力
	Debug($.extend({}, damage, 防御));
	//会心ダメージ　＆　期待値計算
	var critical =  this.calcCritical(params, 非会心ダメージ, 補正後会心率);
	var critical_dot =  this.calcCritical(params, 攻撃DOT, 補正後会心率);
	//　計算結果を設定。
	result.基準防御力 = 防御.基準防御力;
	result.実防御率 =  防御.デバフ後防御率();
	result.通常ダメージ分散 = Util.MAX_MIN(非会心ダメージ);
	result.通常ダメージ = result.通常ダメージ分散.基準;
	result.実会心率 = 補正後会心率;
	result.会心ダメージ分散 = Util.MAX_MIN(critical.会心);
	result.会心ダメージ = result.会心ダメージ分散.基準;
	result.期待値分散 = Util.MAX_MIN(critical.期待値);
	result.期待値 = result.期待値分散.基準;
	result.攻撃DOT = critical_dot;
};
//---------------------------------------
// クラス：UnitTest
// 概要：単体テスト用　開発用
// @constructor
//---------------------------------------
App.UnitTest = function() {
	this.TestData = [];
	this.TestError = [];
};
//-----------------------------------------------
// テストデータの列定義
// @enum
//-----------------------------------------------
App.UnitTest.Field = new Enum([
	'CONST_バージョン',
	'CONST_テストケースID',
	'CONST_武器属性',
	'CONST_スキルID',
	'CONST_スキルLV',
	'CONST_ラピス',
	'CONST_レベル',
	'CONST_攻撃力',
	'CONST_会心率',
	'CONST_会心_ダメージ増加率',
	'CONST_メイン武器_ダメージ増加率',
	'CONST_ボス_ダメージ増加率',
	'CONST_特定スキル_ダメージ増加率',
	'CONST_属性スキル_ダメージ増加率',
	'CONST_XX属性の敵へ_ダメージ増加率',
	'CONST_破防率',
	'CONST_固定値防御減少',
	'CONST_貫通力',
	'CONST_ボスの属性',
	'CONST_敵レベル',
	'CONST_IDダメージ減算',
	'CONST_特殊ダメージ減算',
	'CONST_靱性ダメージ減算',
	'CONST_テスト結果', // N:正常系、E:エラー系
	'CONST_テスト結果_会心ダメージ',
	'CONST_テスト結果_非会心ダメージ'
]);
//-----------------------------------------------
// @param {object} params
// パラメータ→配列→Join
//-----------------------------------------------
App.UnitTest.createTestData = function(params) {
	var values = $.map( params, function( value, key ) {
		return value;
	});

	Debug(values.join(App.COLUMN_SEPARATOR));
};
//-----------------------------------------------
// メソッド定義
//-----------------------------------------------

// テストデータを登録
App.UnitTest.prototype.setUp = function() {
	// 単体テスト用データ
	this.TestData.push('1|1|0|0000|84|0|79|300000|100|300|12|90|0|0|0|0|0|20|0|77|90|84|50|N|29353|9784');
	this.TestData.push('1|1|0|0000|85|0|80|300000|100|300|12|90|16|0|50|0|0|20|0|80|70|84|0|N|84188|28063');
	this.TestData.push('1|1|0|0000|85|0|82|595961|100|300|12|90|0|0|0|0|0|0|0|56|55|0|0|N|1027246|342415');

	// 属性項目が存在しないので、このテストデータはエラー！！あとで直す！
	//this.TestData.push('1|1|2|0703|85|0|80|343434|100|300|12|90|20|100|45|0|0|20|0|80|90|84|0|N|161988|53996');

	//★防御ダウン用テストデータ
	//現状は演算誤差でエラー
	//○98062/36052　×98057/36050
	//this.TestData.push("1|1|0|0|88|0|85|330248|100|272|12|71|0|0|50|30|0|20|0|81|70|84|0|N|98062|36052");

	//最大値チェック用テストデータ　必ずエラーになる↓
	//this.TestData.push("1|1|0|0|83|0|80|123456789|100|400|12|0|0|0|0|0|0|0|0|80|0|0|0|E|103703703|34567901");
};
//-----------------------------------------------
// 単体テストケース（判定）
//-----------------------------------------------
App.UnitTest.prototype.TestCase = function() {
	var calc = new App.Calc();
	var field = App.UnitTest.Field;
	var fieldLength = Object.keys(field).length;
	for (var i = 0,l = this.TestData.length; i < l; i++) {
		var row = this.TestData[i].split(App.COLUMN_SEPARATOR);
		if (fieldLength !== row.length) {
			// データの入力桁数不一致エラー
			throw new Error();
		}

		var params = {
			属性一致武器: new Decimal(row[field.CONST_武器属性]),
			キャラレベル: new Decimal(row[field.CONST_レベル]),
			攻撃力: new Decimal(row[field.CONST_攻撃力]),
			会心率: new Decimal(row[field.CONST_会心率]),
			会心ダメージ増加率: new Decimal(row[field.CONST_会心_ダメージ増加率]),
			メイン武器ダメ増加: new Decimal(row[field.CONST_メイン武器_ダメージ増加率]),
			ボスダメ増加: new Decimal(row[field.CONST_ボス_ダメージ増加率]),
			特定スキルダメージ増加率: new Decimal(row[field.CONST_特定スキル_ダメージ増加率]),
			属性スキル: new Decimal($('#属性スキル').val()),
			属性スキルダメージ増加率: new Decimal(row[field.CONST_属性スキル_ダメージ増加率]),
			XX属性の敵へダメージ増加率: new Decimal(row[field.CONST_XX属性の敵へ_ダメージ増加率]),
			破防率: new Decimal(row[field.CONST_破防率]),
			固定値防御減少: new Decimal(row[field.CONST_固定値防御減少]),
			貫通力: new Decimal(row[field.CONST_貫通力]),
			ボスの属性: new Decimal(row[field.CONST_ボスの属性]),
			敵レベル: new Decimal(row[field.CONST_敵レベル]),
			IDダメージ減算: new Decimal(row[field.CONST_IDダメージ減算]),
			特殊ダメージ減算: new Decimal(row[field.CONST_特殊ダメージ減算]),
			靱性ダメージ減算: new Decimal(row[field.CONST_靱性ダメージ減算]),
			スキルLV : Util.parseInt(row[field.CONST_スキルLV]),
			ラピス : Util.parseInt(row[field.CONST_ラピス]),
		};
		var unique = Util.parseInt(row[field.CONST_スキルID]);
		var skill = App.SkillTable.Search(unique);
		params.スキル = skill;
		//params.チャージ率 = charge;
		
		var result = {};
		var obj = {};
		calc.calc(params, result);
		if(row[field.CONST_テスト結果] === 'N') {
			// 正常系のテスト
			// テスト結果と入力結果を比較
			if(result.会心ダメージ.toFixed(0)== row[field.CONST_テスト結果_会心ダメージ] &&
				result.通常ダメージ.toFixed(0) == row[field.CONST_テスト結果_非会心ダメージ]) {
				// 次のテストデータへ
				continue;
			}
			obj = $.extend({}, row, result);
			this.TestError.push(obj);
		}else {
			if(result.会心ダメージ.toFixed(0)== row[field.CONST_テスト結果_会心ダメージ] &&
				result.通常ダメージ.toFixed(0) == row[field.CONST_テスト結果_非会心ダメージ]) {
				// 次のテストデータへ
				continue;
			}
			// エラー系のテスト
			obj = $.extend({}, row, result);
			this.TestError.push(obj);
		}
	}

};
//-----------------------------------------------
//　テスト終了時にエラーデータが存在時に例外を発生させる。
//-----------------------------------------------
App.UnitTest.prototype.tearDown = function(){
	if (this.TestError.length !== 0) {
		throw new Error();
	}
};
//---------------------------------------
// クラス：Model
// @constructor
//---------------------------------------
App.Model = function(value) {
	this.m = value;
};
// クラス：Modelのメソッド定義
// @param {object} value
App.Model.prototype.setModel = function(value) {
	this.m = value;
};
//---------------------------------------
// クラス：URLParameter
// @constructor
//---------------------------------------
App.URLParameter = function() {
	// 置き換えパターン
	this.Pattern = [
		new App.KeyValuePair('9','武器', 1),
		new App.KeyValuePair('A','属性一致武器', 1),
		new App.KeyValuePair('B','キャラレベル', 1),
		new App.KeyValuePair('C','攻撃力', 1),
		new App.KeyValuePair('D','会心率'),
		new App.KeyValuePair('E','会心ダメージ増加率', 1),
		new App.KeyValuePair('F','メイン武器ダメ増加', 1),
		new App.KeyValuePair('G','ボスダメ増加', 1),
		new App.KeyValuePair('I','属性スキルダメージ増加率', 1),
		new App.KeyValuePair('J','XX属性の敵へダメージ増加率', 1),
		new App.KeyValuePair('K','破防率', 1),
		new App.KeyValuePair('L','固定値防御減少', 1),
		new App.KeyValuePair('M','貫通力', 1),
		new App.KeyValuePair('N','ボスの属性', 1),
		new App.KeyValuePair('O','敵レベル', 1),
		new App.KeyValuePair('P','IDダメージ減算', 1),
		new App.KeyValuePair('Q','特殊ダメージ減算', 1),
		new App.KeyValuePair('R','靱性ダメージ減算', 1),
		new App.KeyValuePair('SH','スキル欄ヘッダー部'),
		new App.KeyValuePair('SD','スキル欄'),
		new App.KeyValuePair('T','スキルLVプラス', 1),
		new App.KeyValuePair('U','属性スキル', 1),
		new App.KeyValuePair('V','武器特化', 1),
		new App.KeyValuePair('X','敵防御上昇バフ', 1)
	];
	// H ：特定スキルダメージ増加率　明細部：スキル欄に項目移動したため廃止
	
};
//-----------------------------------------------
// クラス：URLParameterのメソッド定義
//-----------------------------------------------
// @param {object}　obj
// @return {object} 新しいオブジェクトを生成。
//-----------------------------------------------
App.URLParameter.prototype.toTiny = function(obj) {
	var result = {};
	for(var i=0,l= this.Pattern.length; i < l; i++) {
		var element = this.Pattern[i];
		var value = obj[element.Value];
		switch(element.DataType) {
			case 1:
				result[element.Key] = value.toNumber();
				break;
			default:
				result[element.Key] = value;
				break;
		}
	}
	return result;
};
//-----------------------------------------------
// @param {object}　obj
// @return {object} 新しいオブジェクトを生成。
//-----------------------------------------------
App.URLParameter.prototype.toBig = function(obj) {
	// ToDo:toBigはURL文字列から引数のオブジェクトを生成しているため破壊メソッドでもおｋ
	var result = {};
	for(var i=0,l= this.Pattern.length; i < l; i++) {
		var element = this.Pattern[i];
		result[element.Value] = obj[element.Key];
	}
	return result;
};
//-----------------------------------------------
// object → JSON形式 → encodeURIComponent
// @param {object}　obj
// @return {string}
//-----------------------------------------------
App.URLParameter.prototype.encode = function(obj) {
	var tiny = this.toTiny(obj);
	// スキル欄のヘッダー部を追加
	tiny['SH'] = App.URLParameter.SkillHeader.GetValues();
	var json = JSON.stringify(tiny);
	return encodeURIComponent(json);
};
//-----------------------------------------------
// @param {string}　URL
// @return {object}
//-----------------------------------------------
App.URLParameter.prototype.decode = function(str) {
	var decoded = decodeURIComponent(str);
	var tinyparams = undefined;
	try {
		tinyparams = $.parseJSON(decoded);
	}catch(e)
	{
		Debug(e);
	}
	if (!tinyparams) {
		return undefined;
	}
	var params = this.toBig(tinyparams);
	return params;
};
App.URLParameter.SkillHeader = new Enum(['Unique','SkillLv','ExAbility','ラピス','チャージ']);
	
function Params() {
	this['属性一致武器'] = undefined;
	this['キャラレベル'] = undefined;
	this['攻撃力'] = undefined;
	this['会心率'] = undefined;
	this['会心ダメージ増加率'] = undefined;
	this['メイン武器ダメ増加'] = undefined;
	this['ボスダメ増加'] = undefined;
	this['特定スキルダメージ増加率'] = undefined;
	this['属性スキル'] = undefined;
	this['属性スキルダメージ増加率'] = undefined;
	this['XX属性の敵へダメージ増加率'] = undefined;
	this['破防率'] = undefined;
	this['固定値防御減少'] = undefined;
	this['貫通力'] = undefined;
	this['ボスの属性'] = undefined;
	this['敵レベル'] = undefined;
	this['IDダメージ減算'] = undefined;
	this['特殊ダメージ減算'] = undefined;
	this['靱性ダメージ減算'] = undefined;
};
Params.prototype.setItem  = function(key, value) {
	this[key] = value;
};

}());

//-----------------------------------------------
// クラス：UI
// 概要：主に画面のOnClickイベントより呼び出されるもの
// @constructor
// @includes HtmlUtil
//-----------------------------------------------
var UI = new function() {
	this.HtmlUtil = {};
//	this.View = [];
//	this.Controller = [];
};
//-----------------------------------------------
// メソッド定義
//-----------------------------------------------
// 画面呼び出し時。
// @public
//-----------------------------------------------
UI.OnLoad  = function() {
	this.changeText('#VERSION', 'Version:' + UI.HtmlUtil.escapeHTML(App.VERSION));
	
	this.HtmlUtil.appendSelectBox($('#武器'), App.WEPONS);
	this.HtmlUtil.appendSelectBox($('#属性一致武器'), App.ELEMENTS);
	
	var boss = $('#ボス一覧');
	boss.append(UI.loadMonster().join(''));
	boss.change(function() {
		var value = $(this).val();
		if('-1'.startsWith(value)) {
			return ;
		}
		var values = value.split(',');
		// 防御側
		UI.change('#敵レベル', values[0]);
		UI.change('#ボスの属性', values[1]);
		UI.change('#敵防御上昇バフ', values[5]);
		// ダンジョン
		UI.change('#IDダメージ減算', values[2]);
		UI.change('#特殊ダメージ減算', values[3]);
		UI.change('#靱性ダメージ減算', values[4]);
		// ボスのLVが変わるので再計算
		UI.calcDefenceRate();
	});
	
	this.HtmlUtil.appendSelectBox($('#ボスの属性'), App.ELEMENTS);
	
	this.HtmlUtil.appendSelectBox($('#属性スキル'), App.ELEMENTS);
	// 固定値防御減少ダイアログ
	this.HtmlUtil.appendSelectBox($('#dialog-SkillName'), App.DEFENCE_DOWN_SKILL);
	
	//初期設定をサルキスの氷属性に
	$('#ボスの属性').val(App.ELEMENTS.氷);
	$('#攻撃側').tooltip({content: UI.HtmlUtil.TooltipFunction});
	
	// イベント登録
	(function () {
		var skillChangeEvent = function() {
    		UI.skillLVChange();
		};
		$('#キャラレベル').on('input', skillChangeEvent);
		$('#スキルLVプラス').on('input', skillChangeEvent);
		
		var defenceRateChangeEvent = function() {
    		UI.calcDefenceRate();
		};
		$('#キャラレベル').on('input', defenceRateChangeEvent);
		$('#敵レベル').on('input', defenceRateChangeEvent);
		$('#敵防御上昇バフ').on('input', defenceRateChangeEvent);
		$('#破防率').on('input', defenceRateChangeEvent);
		$('#固定値防御減少').on('input', defenceRateChangeEvent);
	}());
	
	// URL#より初期設定値を取得
	if(this.loadForm(this.HtmlUtil.QueryString(App.URLQUERY_PARAMSKEY))) {
		$('#計算').trigger('click');	
	}else {
		this.weponChange();	
		this.calcDefenceRate();
	}
};
//-----------------------------------------------
// ボスモンスター一覧を作成
// @return {Array.<string>}
//-----------------------------------------------
UI.loadMonster = function() {
	var nest = [];
	var htmlTags = [];
	for(var i=0,l = App.MONSTERS.length; i< l; i++) {
		var monster = App.MONSTERS[i];
		var tag =''
		var text = monster[0];
		if(monster[1] === 0) {
			var endoptgroup = nest.pop();
			if(endoptgroup) {
				tag += endoptgroup;
			}
			tag += '<optgroup label="' + UI.HtmlUtil.escapeHTML(text) + '">';
			nest.push('</optgroup>');
		}else {
			var value = monster.slice(1).join(',');
			tag = '<option value="' + UI.HtmlUtil.escapeHTML(value) + '">' +
				 UI.HtmlUtil.escapeHTML(text) +
				'</option>'
		}
		htmlTags.push(tag);
	}
	htmlTags.push(nest.pop());
	return htmlTags;
};
//-----------------------------------------------
// 画面の項目に値を設定する。
// @param {string} hash		エスケープ処理前
// @return {bool} 計算時はtrue;
//-----------------------------------------------
UI.loadForm = function(str) {
	var h = str;
	if (!h) {
		return false;
	}
	var para = new App.URLParameter();
	var params = para.decode(h);
	if(!params) {
		return false;
	}
	// 画面の項目へ設定処理
	var formatVer = Util.parseInt(UI.HtmlUtil.QueryString('v'));
	// フォーマットバージョン：１に存在しない項目のデフォルト値を設定。
	params.武器 = params.武器|| App.WEPONS.シールドソード;
	params.スキルLVプラス = params.スキルLVプラス || 5;
	params.属性スキル = params.属性スキル || App.ELEMENTS.無;
	params.武器特化 =  params.武器特化 || 1;
	// フォーマットバージョン：３に存在しない項目のデフォルト値を設定。
	params.敵防御上昇バフ =  params.敵防御上昇バフ || 0;
	// ループ化する。予定！
	this.change('#武器', params.武器);
	this.change('#スキルLVプラス', params.スキルLVプラス);
	this.change('#属性スキル', params.属性スキル);
	this.change('#属性一致武器', params.属性一致武器);
	this.change('#キャラレベル', params.キャラレベル);
	this.change('#攻撃力', params.攻撃力);
	this.change('#会心率', params.会心率);
	this.change('#会心ダメージ増加率', params.会心ダメージ増加率);
	$('input[name="特化"]').val([UI.HtmlUtil.escapeHTML(params.武器特化)]);
	this.change('#メイン武器ダメ増加', params.メイン武器ダメ増加);
	this.change('#メイン武器ダメ増加', params.メイン武器ダメ増加);
	this.change('#ボスダメ増加', params.ボスダメ増加);
	this.change('#属性スキルダメージ増加率', params.属性スキルダメージ増加率);
	this.change('#XX属性の敵へダメージ増加率', params.XX属性の敵へダメージ増加率);
	this.change('#破防率', params.破防率);
	this.change('#固定値防御減少', params.固定値防御減少);
	this.change('#貫通力', params.貫通力);
	this.change('#ボスの属性', params.ボスの属性);
	this.change('#敵レベル', params.敵レベル);
	this.change('#敵防御上昇バフ', params.敵防御上昇バフ);
	this.change('#IDダメージ減算', params.IDダメージ減算);
	this.change('#特殊ダメージ減算', params.特殊ダメージ減算);
	this.change('#靱性ダメージ減算', params.靱性ダメージ減算);
	this.weponChange(params.スキル欄ヘッダー部, params.スキル欄);
	
	return true;
};
//-----------------------------------------------
// 画面のid項目に値を設定する。
// @public
// @param {string}		　name id	エスケープ処理前
// @param {string|number}　newvalue 変更後の値　エスケープ処理前
//-----------------------------------------------
UI.change = function(name, newvalue) {
	if(!name || !name.startsWith('#')) {
		// $(<div>) 形式　→　例外を発生させる。
		throw new Error();
	}
	var escape = UI.HtmlUtil.escapeHTML(newvalue);
	$(name).val(escape);
};
//-----------------------------------------------
// 画面のid項目に値を設定する。
// @param {string}		　name id	エスケープ処理前
// @param {string|number}　newvalue 変更後の値　エスケープ処理前
//-----------------------------------------------
UI.changeText = function(name, newvalue) {
	if(!name || !name.startsWith('#')) {
		// $(<div>) 形式　→　例外を発生させる。
		throw new Error();
	}
	var escape = UI.HtmlUtil.escapeHTML(newvalue);
	$(name).text(escape);
};
//-----------------------------------------------
// 画面のid項目から値を取得し、valueの値を加算した値を反映する。
// 		しきい値制限　最小:min属性　最大：max属性
// @public
// @param {string} name id    エスケープ処理前
// @param {number} increment 増分値 エスケープ処理前
//-----------------------------------------------
UI.add = function(name, increment) {
	if(!name || !name.startsWith('#')) {
		// $(<div>) 形式　→　例外を発生させる。
		throw new Error();
	}
	var selector = $(name);
	var current = new Decimal(selector.val());
	if (isNaN(current)) {
		return;
	}
	var newvalue = current.plus(increment).toNumber();
	// 値が非数値のときは画面の項目に設定しない。
	if (isNaN(newvalue)) {
		return;
	}
	// min属性/max属性のしきい値チェック
	var min = selector.attr('min');
	if(min) {
		newvalue = Math.max(newvalue, min);
	}
	var max = selector.attr('max');
	if(max) {
		newvalue = Math.min(newvalue, max);
	}
	this.change(name, newvalue);
};
//-----------------------------------------------
// 概要：武器変更時またはURL引数で呼び出し時にスキル欄の表示を行う。
// @public
// @param {object} header
// @param {object} params
//-----------------------------------------------
UI.weponChange = function(header, params) {
	var tbl = $('#skillTable');
	$('tbody > tr', tbl).remove();
	var skillGroup = App.SkillTable.filter(function(element, index, array){
		if(element.is通常攻撃()) {
			return element;
		}
		if (element.Wepon == $('#武器').val()) {
			return element;
		}
    });
	var headers = App.URLParameter.SkillHeader;
	var check = $('input[name="特化"]:checked').val();
	var main = new Decimal($('#キャラレベル').val()).plus($('#スキルLVプラス').val());
	var htmlTags = [];
	var chargeTHCount = 0;
	for(var i=0,l=skillGroup.length; i<l; i++) {
		var skill = skillGroup[i];
		var skillLv = main.toNumber();
		var exAbility = 0;
		var ラピス = 0;
		var チャージ = '';
		if(params) {
			var paramSkill = params.filter(function(element, index, array) {
				if (element[headers.Unique] === skill.Unique) {
					return element;
				}
    		})[0];
			// スキル欄よりスキルを検索できた場合に値をURL引数より値を設定、設定できない場合はデフォルト値。
			// メッセージを表示した方が親切かも！！
			if(paramSkill) {
				skillLv = Util.parseInt(paramSkill[headers.SkillLv]);
				exAbility = Util.parseInt(paramSkill[headers.ExAbility]);
				ラピス = Util.parseInt(paramSkill[headers.ラピス]);
				if(Util.parseInt(paramSkill[headers.チャージ]) === App.CHARGE_TYPE['100']) {
					チャージ = 'checked';
				}
			}
		}
		if(skill.isチャージ編集可()) {
			chargeTHCount++;
		}
		var item = '<td class="hidden">@0@</td>' +
			'<td class="LEFT" title="' + skill.getToolTip()  + '">@1@</td>' +
			(skill.isSkillLV編集可() ? '<td><input type="number" class="SMALL スキルLV" value="@2@" min="1" max="9999"></td>' : '<td class="CENTER スキルLV">@2@</td>') +
			'<td class="CENTER @3@">@3@</td>' +
			'<td>' + (!skill.is通常攻撃() ? '@4@%' : '') + '</td>' +
			'<td>' + (!skill.is通常攻撃() ? '@5@秒' : '') + '</td>' +
			'<td class="CENTER COL_CHARGE">' + (skill.isチャージ編集可() ? '<input type="checkbox" @6@>' : '') + '</td>' +
			'<td>' +
				 (skill.isExAbility編集可() ? '<input type="number" value="@7@" min="0" max="999999" step="">%' : '0') + 
				 (skill.特化ダメージ増加率[1].toNumber() !== 0 ? '<div class="EX1">＋' + skill.特化ダメージ増加率[1].toNumber() + '%</div>' : 						'<div class="EX1"></div>') +
				 (skill.特化ダメージ増加率[2].toNumber() !== 0 ? '<div class="EX2">＋' + skill.特化ダメージ増加率[2].toNumber() + '%</div>' : 						'<div class="EX2"></div>') +
			'</td>' +
			'<td>' + (skill.isラピス() ? '<input type="number" value="@8@" min="0" max="999999">' : '0') + '</td>';
		var tr = '<tr class="EX' + skill.EXスキル + '">';
		htmlTags.push(tr);
		item = item.replace(/@0@/g, skill.Unique)
			.replace(/@1@/g, UI.HtmlUtil.escapeHTML(skill.Name))
			.replace(/@2@/g, UI.HtmlUtil.escapeHTML(skillLv))
			.replace(/@3@/g, UI.HtmlUtil.escapeHTML(App.ELEMENTS[skill.Element]))
			.replace(/@4@/g, UI.HtmlUtil.escapeHTML(skill.スキル倍率))
			.replace(/@5@/g, UI.HtmlUtil.escapeHTML(skill.GCD))
			.replace(/@6@/g, UI.HtmlUtil.escapeHTML(チャージ))
			.replace(/@7@/g, UI.HtmlUtil.escapeHTML(exAbility))		
			.replace(/@8@/g, UI.HtmlUtil.escapeHTML(ラピス));	
		htmlTags.push(item);
		htmlTags.push('</tr>');
	}

	$('tbody', tbl).append(htmlTags.join(''));
	// チャージスキルが1件でも存在する時に列を表示
	if(chargeTHCount === 0) {
		tbl.find('.COL_CHARGE').addClass('hidden');
	} else {
		tbl.find('.COL_CHARGE').removeClass('hidden');
	}
	UI.SkillExOnChanged();
	tbl.tooltip({content: UI.HtmlUtil.TooltipFunction});
};
//-----------------------------------------------
// 概要：キャラLVまたはスキルLV＋を変更時にスキル欄のスキルLVの書き換えを行う。
// @public
//-----------------------------------------------
UI.skillLVChange = function() {
	var mainLv = new Decimal($('#キャラレベル').val()).plus($('#スキルLVプラス').val());
	var skillLv = mainLv.toNumber();
	// テーブルのID指定→children
	var tr = $('#skillTable > tbody > tr');
	tr.children('.スキルLV').text(skillLv);
	tr.children('td').children('input.スキルLV').val(skillLv);
};
//-----------------------------------------------
// 概要：レベルと防御ステータスから基準防御力、実防御率を算出
// @public
//-----------------------------------------------
UI.calcDefenceRate = function() {
	var params = {
		イベントソース: 'UI#calcDefenceRate',
		キャラレベル: new Decimal($('#キャラレベル').val()),
		敵レベル: new Decimal($('#敵レベル').val()),
		敵防御上昇バフ: new Decimal($('#敵防御上昇バフ').val()),
		破防率: new Decimal($('#破防率').val()),
		固定値防御減少: new Decimal($('#固定値防御減少').val())
	};
	var calc = new App.Calc();
	var 防御 = calc.createDefence(params);
	this.change('#敵防御力', 防御.基準防御力);
	this.change('#実防御率', 防御.デバフ後防御率());
};
//-----------------------------------------------
// 概要：固定値防御減少値の入力補助ダイアログを表示する。
// @public
//-----------------------------------------------
UI.openDefenceRateDialog = function() {
	// ダイアログを作成し、表示する。
	var selector = $('#jquery-ui-dialog-defenceRate');
	if(!selector.hasClass('init')) {
		// ダイアログ表示時の初期化処理
		var skillName = $('#dialog-SkillName');
		var mainLv = new Decimal($('#キャラレベル').val()).plus($('#スキルLVプラス').val());
		UI.change('#dialog-SkillLv', mainLv.toNumber());
		
		// イベント登録
		skillName.change(UI.DialogOnDefenceDown);		
		$('#dialog-SkillLv').on('input', UI.DialogOnDefenceDown);
		
		selector.addClass('init').dialog({
        	autoOpen: false,
        	width: 450,
        	modal: true,
        	buttons: {
            	'加算': function() {		
					UI.add('#固定値防御減少', $('#dialog-DefenceDown').val());
					UI.calcDefenceRate();
					$(this).dialog('close');
				},
				'減算': function() {		
					UI.add('#固定値防御減少', new Decimal($('#dialog-DefenceDown').val()).times(-1).toString());
					UI.calcDefenceRate();
					$(this).dialog('close');
				},
				'キャンセル': function() {
					$(this).dialog('close');
				},
			}
    	});
	}
	selector.dialog('open');
};
//-----------------------------------------------
// ダイアログのメソッドが間違えやすいのでどーにかする。
// 概要：固定値防御減少値の入力補助ダイアログのイベント。
// @public
//-----------------------------------------------
UI.DialogOnDefenceDown = function() {
	var skillName = $('#dialog-SkillName');
	var value = skillName.val();
	if('-1'.startsWith(value)) {
		UI.change('#dialog-DefenceDown', 0);
		return ;
	}
	var values = value.split(',');
	var down = Util.ROUND_HALF_DOWN(new Decimal(Math.pow($('#dialog-SkillLv').val(), 2) + 30)
									.times(new Decimal(values[0])));
	UI.change('#dialog-DefenceDown', down.toNumber());	
};
//-----------------------------------------------
// 概要：基準防御力の入力補助ダイアログを表示する。
// @public
//-----------------------------------------------
UI.openBaseDefenceDialog = function() {
	// ダイアログを作成し、表示する。
	var selector = $('#jquery-ui-dialog-baseDefence');
	
	if(!selector.hasClass('init')) {
		UI.change('#dialog-MonsterLv', $('#敵レベル').val());
		// イベント登録	
		$('#dialog-MonsterLv').on('input', UI.DialogOnBaseDefence);
		// イベント初回発火
		UI.DialogOnBaseDefence();
		selector.addClass('init').dialog({
        	autoOpen: false,
        	width: 450,
        	modal: true,
        	buttons: {
            	'設定': function() {		
					UI.change('#敵防御力', $('#dialog-BaseDefence').val());
					UI.calcDefenceRate();
					$(this).dialog('close');
				},
				'キャンセル': function() {
					$(this).dialog('close');
				},
			}
    	});
	}
	selector.dialog('open');
};
//-----------------------------------------------
// 概要：基準防御力の入力補助ダイアログのイベント。
// @public
//-----------------------------------------------
UI.DialogOnBaseDefence = function() {
	var 基準防御力 = Util.BASED_DEFENSE(new Decimal($('#dialog-MonsterLv').val()));
	UI.change('#dialog-BaseDefence', 基準防御力);	
};

//-----------------------------------------------
// 計算ボタンを押下時に呼び出し。
// @public
//-----------------------------------------------
UI.calc = function() {
	// エスケープ前
	// 値のパース処理を呼び出し元/先どちらでおこなうのか調整！

	var tblTh = new Enum(['UID','名前','Lv','属性','倍率','GCD','チャージ','EXアビ','ラピス']);
 	// 画面項目より値を設定
	var params = UI.getFormData('UI#calc');
	var result = {};
	// 入力チェックがないので追加する予定！！
	UI.ResultClear();
	var 武器特化 = $('input[name="特化"]:checked').val();
	var tbl = UI.HtmlUtil.getTableData('#skillTable');
	
	var tab_radio = $('input[name="tab_radio"]:checked').val();
	var calc = new App.Calc();
	var htmlTags = [];
	// スキル分だけループ
	for (var i=0,l=tbl.length; i< l; i++) {
		var row = tbl[i];
		var unique = Util.parseInt(row[tblTh.UID]);
		var skillLv = Util.parseInt(row[tblTh.Lv]);
		var skill = App.SkillTable.Search(unique);
		var charge = App.CHARGE_TYPE['無'];
		if(row[tblTh.チャージ]) {
			charge = App.CHARGE_TYPE['100'];
		}
		var exAbility = Util.parseInt(row[tblTh.EXアビ]);
		params.スキルLV = skillLv;
		params.ラピス = Util.parseInt(row[tblTh.ラピス]);
		params.特定スキルダメージ増加率 = new Decimal(exAbility).plus(skill.特化ダメージ増加率[武器特化]);
		params.チャージ率 = charge;
		App.UnitTest.createTestData(params);
		// スキルに設置スキルが存在するときは、設置スキルもダメージ計算を行う。
		var skills = [skill, skill.設置スキル];
		for(var j=0, k=skills.length; j< k; j++) {
			var current = skills[j];
			if(!current) {
				continue;
			}
			// スキル欄で値の入力不可能なスキル
			if(current.isExport()) {
				var skillPara = [
					skill.Unique,
					skillLv,
					exAbility,
					params.ラピス,
					params.チャージ率
				];
				params.スキル欄.push(skillPara);
			}
			params.スキル = current;
			if(current.設置) {
				// 聖剣スキル：ブレイクソードの場合はチャージ状態のみ
				if(skill.Unique === 1304 && charge !== App.CHARGE_TYPE['100']) {
					continue;
				}
				// 設置スキルと元スキルの名称が同じもの
				//（太刀：九曜一閃・飛燕、アークス：ディメンションシュート、手裏剣：風遁・旋風鎌鼬）以外				
				if(skill.Name !== current.Name) {
					params.特定スキルダメージ増加率 = Decimal.ZERO;
					params.ラピス = 0;
					params.チャージ率 = App.CHARGE_TYPE['無'];
				}
			}
			calc.calc(params, result);
			// paramsは画面入力値なので、画面に値を設定時にエスケープ処理が必要
			var item = 
				(current.属性一致(params.属性一致武器) ? '<td class="LEFT BOLD" title="@2@">' : '<td class="LEFT" title="@2@">') + '@0@</td>' +
				(params.ラピス !== 0 ? '<td class="ラピス">' : '<td>') + '@1@</td>' +
				UI.HtmlUtil.DamageColumn('CRITICAL', tab_radio, result.会心ダメージ分散, current) +
				UI.HtmlUtil.DamageColumn('NORMAL', tab_radio, result.通常ダメージ分散, current) +
				UI.HtmlUtil.DamageColumn('BASED', tab_radio, result.期待値分散, current) +
				UI.HtmlUtil.AtkDotColumn('CRITICAL', tab_radio, result.攻撃DOT.会心, params) +
				UI.HtmlUtil.AtkDotColumn('NORMAL', tab_radio, result.攻撃DOT.非会心, params) +
				UI.HtmlUtil.AtkDotColumn('BASED', tab_radio, result.攻撃DOT.期待値, params) +
				'<td>' + UI.HtmlUtil.escapeHTML(result.実会心率.toFixed(2)) + '</td>';
			if(!current.設置) {
				item = item.replace(/@0@/g, UI.HtmlUtil.escapeHTML(params.スキル.Name))
							.replace(/@1@/g, UI.HtmlUtil.escapeHTML(result.表記スキルダメージ.toString()))
							.replace(/@2@/g, current.getToolTip());
			}else {
				item = item.replace(/@0@/g, UI.HtmlUtil.escapeHTML('[設置]' + current.Name))
							.replace(/@1@/g, UI.HtmlUtil.escapeHTML(result.表記スキルダメージ.toString()) +
											'<br>*' + UI.HtmlUtil.escapeHTML(current.Hit) +'Hit')
							.replace(/@2@/g, current.getToolTip());
			}
			htmlTags.push('<tr class="EX' + current.EXスキル + '">');
			htmlTags.push(item);
			htmlTags.push('</tr>');
		}
		//　スキルの数分ループするため、画面に値反映は初回のみとする
		if(i === 0) {
			this.change('#敵防御力', result.基準防御力);
			this.change('#実防御率', result.実防御率);
		}
	}
	$('#calcResultTable > tbody')
		.append(htmlTags.join(''))
		.tooltip({content: UI.HtmlUtil.TooltipFunction});
	UI.SkillExOnChanged();
	//入力パラメータのURL生成
	UI.createURL(params);
};
//-----------------------------------------------
// 計算結果の会心時/非会心時/期待値の表示切替
// @public
// @param {object}　selector
//-----------------------------------------------
UI.TabOnChanged = function(selector) {
	var tbl = $('#calcResultTable');
	var current = $('#' + selector.id);
	// タブのコンテンツを全て非表示
	tbl.find('.TAB_CONTENTS').addClass('hidden');
	var c = '.' + current.val();
	tbl.find(c).removeClass('hidden');
};
//-----------------------------------------------
// 特化　左特化/右特化の表示切替
// @public
// @param {object}　selector
//-----------------------------------------------
UI.SkillExOnChanged = function(selector) {
	var check = $('input[name="特化"]:checked').val();
	var TBL = [$('#skillTable'), $('#calcResultTable')];
	for (var i=0,l= TBL.length; i<l ;i++) {
		var element = TBL[i];
		element.find('.EX1').addClass('hidden');
		element.find('.EX2').addClass('hidden');
		element.find('.EX' + check).removeClass('hidden');
	}
};
//-----------------------------------------------
// 画面項目→paramsに格納
// @param {string}　name
// @return {object}
//-----------------------------------------------
UI.getFormData = function(name) {
	var params = {
		イベントソース: name,
		武器: new Decimal($('#武器').val()),
		属性一致武器: new Decimal($('#属性一致武器').val()),
		キャラレベル: new Decimal($('#キャラレベル').val()),
		スキルLVプラス: new Decimal($('#スキルLVプラス').val()),
		攻撃力: new Decimal($('#攻撃力').val()),
		スキルダメージ: Decimal.ZERO,
		武器特化: new Decimal($('input[name="特化"]:checked').val()),
		スキル欄: [],
		会心率: new Decimal($('#会心率').val()),
		会心ダメージ増加率: new Decimal($('#会心ダメージ増加率').val()),
		メイン武器ダメ増加: new Decimal($('#メイン武器ダメ増加').val()),
		ボスダメ増加: new Decimal($('#ボスダメ増加').val()),
		特定スキルダメージ増加率: Decimal.ZERO,
		属性スキル: new Decimal($('#属性スキル').val()),
		属性スキルダメージ増加率: new Decimal($('#属性スキルダメージ増加率').val()),
		XX属性の敵へダメージ増加率: new Decimal($('#XX属性の敵へダメージ増加率').val()),
		破防率: new Decimal($('#破防率').val()),
		固定値防御減少: new Decimal($('#固定値防御減少').val()),
		貫通力: new Decimal($('#貫通力').val()),
		ボスの属性: new Decimal($('#ボスの属性').val()),
		敵レベル: new Decimal($('#敵レベル').val()),
		敵防御上昇バフ: new Decimal($('#敵防御上昇バフ').val()),
		IDダメージ減算: new Decimal($('#IDダメージ減算').val()),
		特殊ダメージ減算: new Decimal($('#特殊ダメージ減算').val()),
		靱性ダメージ減算: new Decimal($('#靱性ダメージ減算').val()),
	};
	return params;
};
//-----------------------------------------------
// 計算結果をクリア
// @public
//-----------------------------------------------
UI.ResultClear = function() {
	$('#calcResultTable > tbody > tr').remove();
	$('#URL生成').val('');
};
//-----------------------------------------------
// 単体テストボタン
// @public
//-----------------------------------------------
UI.UnitTest = function() {
	var test = new App.UnitTest();
	try {
		test.setUp();
		test.TestCase();
	}
	finally {
		test.tearDown();
	}
};
//-----------------------------------------------
// URL生成
// @param {object}　params　画面入力値
//-----------------------------------------------
UI.createURL = function(params) {
	// NullFunctionを作成する。
	var para = new App.URLParameter();
	var encstr = para.encode(params);
	var url = UI.HtmlUtil.BaseURL() + '?' +
		App.URLQUERY_PARAMSKEY + '=' + encstr +
		'&v=' + App.URLFORMAT_VERSION;
	//エスケープ処理が必要かも！
	$('#URL生成').val(url);
};
//-----------------------------------------------
// 画面を開きなおす。（開発用）
// @param {object}　params　
//-----------------------------------------------
UI.transformURL = function() {
	// ★　location.href使用してるため、CSRFに注意　★
	var newURL = $('#URL生成').val();
	// リダイレクト先のURLが自身のURLで始まるかのチェック
	if(newURL.startsWith(UI.HtmlUtil.BaseURL())) {
		window.location.href = newURL;
	}
}
//-----------------------------------------------
//　クラス：UI.HtmlUtil
//　概要：HTML関係
//-----------------------------------------------
// #/?なしのURLを戻り値として返す。
// @return {string}
//-----------------------------------------------
UI.HtmlUtil.BaseURL = function() {
	// URLはクエリ文字列 リンク文字列か？
	var baseurl = location.href;
	var suffix = ['?','#'];
	for(var i=0,l = suffix.length; i< l; i++) {
		var index = baseurl.indexOf(suffix[i]);
		if (index !== -1) {
			return baseurl.substr(0, index);
		}
	}
	return baseurl;
};
//-----------------------------------------------
// HTTP クエリ文字列を取得する。
// @param {string}　検索キー
// @return {string} 検索キーに対応する最初の値。
// 　値が取得できなかった場合、ブランク文字列
//　　キーに該当する値が複数存在時は最初の値
//-----------------------------------------------
UI.HtmlUtil.QueryString  = function(searchkey) {
	var searchpart = location.search.slice(1);
	if(searchpart.length === 0) {
		return '';
	}
	var vars = searchpart.split('&');
	for (var i=0,l = vars.length; i< l; i++) {
		var pair = vars[i].split('=', 2);
        if (pair[0] === searchkey) {
            return pair[1];
        }
	}
	return '';
};
//-----------------------------------------------
// セレクトボックスに項目追加
// HTMLタグのoptionを生成
// @param {HTMLDocument} name
// @param {Array.<Array>|Enum} list
//-----------------------------------------------
UI.HtmlUtil.appendSelectBox = function(name, list) {
	var options = undefined;
	if(!Array.isArray(list)) {
		options = $.map(list, function (value, key) {
			if(!$.isFunction(value)) {
				return $('<option>', { value: value, text: key });
			}
		});
	}else {
		options = $.map(list, function (value) {
			if(!$.isFunction(value)) {
				return $('<option>', { value: value.slice(1).join(','), text: value[0] });
			}
		});
	}
	name.append(options);
};
//-----------------------------------------------
// テーブルデータを取得し、2次元配列で返却
// @param {string} tableName
// @return {Array.<Array>}
//-----------------------------------------------
UI.HtmlUtil.getTableData = function(tableName) {
	var data = [];
	var rows = $(tableName + ' > tbody > tr');
	for(var i =0,l = rows.length; i<l; i++ ) {
		var row = rows.eq(i).children();
		var r = [];
		for(var j=0,m = row.length; j<m; j++ ) {
			var cell = row.eq(j);
			var children = cell.children();
			var inputType = children.attr('type');
			if(!inputType) {
				// td
				r.push(cell.text());
				continue;
			}
			// td -> input
			var obj = undefined;
			switch (inputType.toUpperCase()) {
				case 'NUMBER':
					r.push(children.val());
					continue;
					break;
				case 'CHECKBOX':
					// true or false;
					obj = children.is(':checked');
					break;
				default:
					obj = children.val();			
					break;
			}
			r.push(obj);
		}
		data.push(r);
	}
	return data;
};
//-----------------------------------------------
// HTMLエスケープ関数
// @param {string|number} value		エスケープ処理前
// @return {string}				エスケープ処理後
//-----------------------------------------------
UI.HtmlUtil.escapeHTML = function(value) {
	// 参考　String#replace関数(/SubString/g グローバルマッチ, newSubString);
	var newvalue = '' + value;
	return newvalue.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
};
//-----------------------------------------------
// 計算結果のダメージ列のHTMLタグを生成
// @param {string} classTag	
// @param {string} tab_radio	選択しているタブ	
// @param {object.<decimal>} 分散	
// @param {Skill} skill	
// @return {string}	
//-----------------------------------------------
UI.HtmlUtil.DamageColumn = function(classTag, tab_radio, 分散, skill) {
	if(tab_radio !== classTag) {
		classTag += ' hidden';
	}
	classTag += ' TAB_CONTENTS';
	if(skill.is通常攻撃()) {
		return '<td class="CENTER ' + classTag + '" colspan="2">' + UI.HtmlUtil.escapeHTML(分散.基準.toFixed(0)) + '</td>';
	}
	return ('<td class="@0@">　@1@</td><td class="CENTER @0@">@2@ ～ @3@</td>')
			.replace(/@0@/g, UI.HtmlUtil.escapeHTML(classTag))
			.replace(/@1@/g, UI.HtmlUtil.escapeHTML(分散.基準.toFixed(0)))
			.replace(/@2@/g, UI.HtmlUtil.escapeHTML(分散.下限.toFixed(0)))
			.replace(/@3@/g, UI.HtmlUtil.escapeHTML(分散.上限.toFixed(0)));
};

//-----------------------------------------------
// 計算結果の攻撃5%DOT列のHTMLタグを生成
// @param {string} classTag	
// @param {string} tab_radio	選択しているタブ	
// @param {object.<decimal>} value	
// @param {object} params	
// @return {string}	
//-----------------------------------------------
UI.HtmlUtil.AtkDotColumn = function(classTag, tab_radio, value, params) {
	if(tab_radio !== classTag) {
		classTag += ' hidden';
	}
	classTag += ' COL_ATKDOT TAB_CONTENTS';
	if(value.eq(Decimal.ZERO)) {
		return ('<td class="@0@">&nbsp</td>')
			.replace(/@0@/g, UI.HtmlUtil.escapeHTML(classTag))
	}
	
	return ('<td class="@0@">@1@(@2@s)</td>')
			.replace(/@0@/g, UI.HtmlUtil.escapeHTML(classTag))
			.replace(/@1@/g, UI.HtmlUtil.escapeHTML(value.toFixed(0)))
			.replace(/@2@/g, UI.HtmlUtil.escapeHTML(params.スキル.攻撃DOTスキル持続時間.toNumber()));
};

//-----------------------------------------------
// Jquery UI Tooltip の改行対応 function 
// @return {string}	
//-----------------------------------------------
UI.HtmlUtil.TooltipFunction = function() {
	return $(this).attr('title');
};