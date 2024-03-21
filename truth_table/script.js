//論理式の入力欄と表作成ボタンを取得
const textbox = document.getElementById("expression");
const button = document.getElementById("create");
//真理表にするテーブルを取得
const truthTable = document.getElementById("truthTable");

//ボタン押下時の挙動
button.addEventListener("click",function(){
	//論理式を取得
	const expression = textbox.value;
	//字句解析
	const tokens = lexicalAnalysis(expression);
	//構文解析
	const tree = parseExpression(tokens);
	//逆ポーランド記法
	const rpn = createRpnArray(tree);

/*
	tokens.forEach(function(token){
		console.log(token.type + ": " + token.data);
	});
*/

	//命題変項を取り出す
	const iterator = expression.matchAll(/[a-z]/g);
	const variables = Array.from(iterator).flat(1);
	//要素の重複をなくして真理値の組み合わせを求める
	//アルファベット順にソート
	const cleanVariables = Array.from(new Set(variables)).sort();
	const product = cleanVariables.length===1 ? [[1],[0]] : createDirectProduct(cleanVariables);
	//行の配列を{変項:列...}の連想配列に変換
	const columnList = createColumnList(product,cleanVariables);
	//論理式全ての真理値を計算
	const completeColumnList = calculateTruthValue(rpn,columnList);
	//真理表の作成
	createTruthTable(completeColumnList);
/*
	//命題変項の列を作成
	createVariableColumn(cleanVariables,product);

	const iterator2 = expression.matchAll(/¬[a-z]|[a-z]∧[a-z]|[a-z]∨[a-z]/g);
	const compound = Array.from(iterator2).flat(1);
	compound.forEach(function(value){
		if(value.includes("¬")){
			const index = cleanVariables.indexOf(value.charAt(1));
			const column = [value];
			product.forEach(function(line){
				if(line[index] === 1){
					column.push(0);
				}else{
					column.push(1);
				}
			});
			createCompoundColumn(column);
		}else if(value.includes("∧")){
			const index1 = cleanVariables.indexOf(value.charAt(0));
			const index2 = cleanVariables.indexOf(value.charAt(2));
			const column = [value];
			product.forEach(function(line){
				if(line[index1]===1 && line[index2]===1){
					column.push(1);
				}else{
					column.push(0);
				}
			});
			createCompoundColumn(column);
		}else if(value.includes("∨")){
			const index1 = cleanVariables.indexOf(value.charAt(0));
			const index2 = cleanVariables.indexOf(value.charAt(2));
			const column = [value];
			product.forEach(function(line){
				if(line[index1]===1 || line[index2]===1){
					column.push(1);
				}else{
					column.push(0);
				}
			});
			createCompoundColumn(column);
		}
	});
*/
});

//論理式をトークン列に分解する
function lexicalAnalysis(expression){
	const tokens = [];
	for(let i=0; i<expression.length; i++){
		//先頭から1文字ずつ取り出す
		const charcter = expression.charAt(i);
		//トークンはオブジェクトで表現
		const token = new Object();
		//文字はdata、種類はtypeに設定
		token.data = charcter;
		if(charcter.match(/\(|\)/)){
			//カッコ
			token.type = "bracket";
		}else if(charcter.match(/[a-z]/)){
			//命題変項
			token.type = "variable";
		}else if(charcter.match(/¬|∧|∨|→/)){
			//論理結合子
			token.type = "operator";
		}else{
			token.type = "exception";
		}
		tokens.push(token);
	}
	return tokens;
}

//トークン列から構文木を作成する
//<expression>:=<unary>{('∧'|'∨'|'→')<unary>}
function parseExpression(tokens){
	const iterator = tokens[Symbol.iterator]();
	let expression = parseUnaryExpression();
	const firstToken = getNextValue();
	if(firstToken){
		expression = parseBinaryExpression(expression,firstToken);
	}
	return expression;
	
	function parseBinaryExpression(unary,token){
		const binary = new Object();
		binary.type = "binary";
		binary.leftUnary = unary;
		binary.operator = token;
		binary.rightUnary = parseUnaryExpression();
		return binary;
	}
	//unary:=['¬']<term>
	function parseUnaryExpression(){
		const unary = new Object();
		unary.type = "unary";
		let token = getNextValue();
		if(token.type === "operator"){
			unary.operator = token;
			token = getNextValue();
		}
		unary.term = parseTermExpression(token);
		return unary;
	}
	//term:=(<variable>|'('<expression>')')
	function parseTermExpression(token){
		let term = "default";
		if(token.type === "variable"){
			term = token;
		}else if(token.data === "\("){
			term = parseExpression(cutUpToBracket());
		}
		return term;
	}

	function getNextValue(){
		const result = iterator.next();
		const value = result.done ? null : result.value;
		return value;
	}
	function cutUpToBracket(){
		const inBrackets = [];
		let count = 0;
		let value = getNextValue();
		while(value.data !== "\)" || count === 0){
			if(value.data === "\("){
				count++;
			}
			inBrackets.push(value);
			value = getNextValue();
			if(value.data === "\)"){
				count--;
			}
		}
		return inBrackets;
	}
}

//構文木からポーランド記法の論理式を得る
function createRpnArray(tree){
	const rpn = [];
	switch(tree.type){
		case "unary":
			addUnaryToRPN(tree);
			break;
		case "binary":
			addBinaryToRPN(tree);
			break;
		default:
	}
	return rpn;

	function addBinaryToRPN(obj){
		addObjToRPN(obj.leftUnary);
		addObjToRPN(obj.rightUnary);
		addObjToRPN(obj.operator);
	}
	function addUnaryToRPN(obj){
		addObjToRPN(obj.term);
		if(obj.hasOwnProperty("operator")){
			addObjToRPN(obj.operator);
		}
	}
	function addObjToRPN(obj){
		switch(obj.type){
			case "variable":
			case "operator":
				rpn.push(obj);
				break;
			case "unary":
				addUnaryToRPN(obj);
				break;
			case "binary":
				addBinaryToRPN(obj);
				break;
			default:
		}
	}
}


function createTruthTable(columnList){
	const keys = Object.keys(columnList);
	let headLine = `<tr>`;
	keys.forEach(function(key){
		headLine += `<th>${key}</th>`;
	});
	headLine += `</tr>`;
	truthTable.innerHTML = headLine;

	const dataLineNumber = columnList[keys[0]].length;
	for(let i=0; i<dataLineNumber; i++){
		let dataLine = `<tr>`;
		for(let j=0; j<keys.length; j++){
			dataLine += `<td>${columnList[keys[j]][i]}</td>`;
		}
		dataLine += `</tr>`;
		truthTable.innerHTML += dataLine;
	}
/* 
	for(let i=-1; i<data.length; i++){
		if(i===-1){
			header.forEach(function(variable){
				line += `<th>${variable}</th>`;
			});
			line += `</tr>`;
			truthTable.innerHTML = line;
		}else{
			let line = `<tr>`;
			data[i].forEach(function(truthValue){
				line += `<td>${truthValue}</td>`;
			});
			line += `</tr>`;
			truthTable.innerHTML += line;
		}
	}
*/
	//CSSの有効化
	truthTable.setAttribute("disabled","true");
}

/*直積を求める
2つの配列からなる2次元配列の直積を求める
配列が2つを超える場合、2番目以降の配列について再起処理を加えて一つに合わせる
*/
function createDirectProduct(array){
	const shortArray = array.slice(1);
	const following = shortArray.length===1 ? [1,0] : createDirectProduct(shortArray);
	const product = [1,0].map(head => following.map(tail => [head].concat(tail))).flat(1);
	
	return product;
}

function createColumnList(product,variables){
	const columnList = new Object();
	//列の数だけサブ配列を登録する。キーは変項
	for(let i=0; i<product[0].length; i++){
		columnList[variables[i]] = [];
	}
	//行ごとに、違う列の値を分けて格納
	product.forEach(function(line){
		for(let i=0; i<line.length; i++){
			columnList[variables[i]].push(line[i]);
		}
	});
	return columnList;
}

function calculateTruthValue(rpn,columnList){
	//RPNを使ってスタック処理
	const stack = [];
	rpn.forEach(function(token){
		switch(token.type){
			case "variable":
				stack.push(token.data);
				break;
			case "operator":
				if(token.data === "¬"){
					const ope = stack.pop();
					const key = "¬" + ope;
					stack.push(key);
					columnList[key] = notOperation(ope);
				}else{
					const right = stack.pop();
					const left = stack.pop();
					const key = "\(" + left + token.data + right + "\)";
					stack.push(key);
					columnList[key] = binaryOperation(left,token.data,right);
				}
				break;
			default:	
		}
	});
	return columnList;

	function notOperation(operand){
		const column = [];
		columnList[operand].forEach(function(value){
			switch(value){
				case 1:
					column.push(0);
					break;
				case 0:
					column.push(1);
					break;
				default:
			}
		});
		return column;
	}
	function binaryOperation(left,ope,right){
		const column = [];
		for(let i=0; i<columnList[left].length; i++){
			const leftV = columnList[left][i];
			const rightV = columnList[right][i];
			switch(ope){
				case "∧":
					if(leftV===1 && rightV ===1){
						column.push(1);
					}else{
						column.push(0);
					}
					break;
				case "∨":
					if(leftV===1 || rightV ===1){
						column.push(1);
					}else{
						column.push(0);
					}
					break;
				case "→":
					if(leftV===0 || rightV ===1){
						column.push(1);
					}else{
						column.push(0);
					}
					break;
				default:
					console.log("default");
			}
		}
		return column;
	}
}
