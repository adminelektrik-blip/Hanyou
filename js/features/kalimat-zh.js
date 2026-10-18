function kzMake(vocab,chars){
  const W=new Map();let mx=1;
  vocab.forEach(w=>{if(!W.has(w.hanzi)){W.set(w.hanzi,w);mx=Math.max(mx,w.hanzi.length);}});
  const isH=c=>/[\u4e00-\u9fff]/.test(c);
  function segment(t){
    const out=[];let i=0,buf='';
    const flush=()=>{if(buf){out.push({t:buf});buf='';}};
    while(i<t.length){
      if(!isH(t[i])){buf+=t[i++];continue;}
      let hit=null;
      for(let L=Math.min(mx,t.length-i);L>0;L--){const w=W.get(t.substr(i,L));if(w){hit={t:w.hanzi,py:w.pinyin,ar:w.arti,lv:w.level};break;}}
      if(!hit&&chars[t[i]])hit={t:t[i],py:chars[t[i]],ar:'',lv:0};
      if(hit){flush();out.push(hit);i+=hit.t.length;}else buf+=t[i++];
    }
    flush();return out;
  }
  return {segment};
}

const KZ_CHARS={"爸":"bà","杯":"bēi","子":"zi","北":"běi","京":"jīng","厨":"chú","房":"fáng","多":"duō","少":"shǎo","儿":"ér","工":"gōng","作":"zuò","今":"jīn","天":"tiān","老":"lǎo","师":"shī","妈":"mā","名":"míng","字":"zì","朋":"péng","友":"yǒu","学":"xué","校":"xiào","帮":"bāng","助":"zhù","表":"biǎo","示":"shì","唱":"chàng","歌":"gē","发":"fā","现":"xiàn","告":"gào","诉":"su","关":"guān","系":"xì","简":"jiǎn","单":"dān","解":"jiě","决":"jué","觉":"jué","得":"dé","可":"kě","能":"néng","快":"kuài","乐":"lè","离":"lí","开":"kāi","麻":"má","烦":"fan","没":"méi","有":"yǒu","难":"nán","道":"dào","清":"qīng","楚":"chu","如":"rú","果":"guǒ","身":"shēn","体":"tǐ","时":"shí","间":"jiān","所":"suǒ","以":"yǐ","特":"tè","别":"bié","完":"wán","成":"chéng","希":"xī","望":"wàng","一":"yī","定":"dìng","已":"yǐ","经":"jīng","准":"zhǔn","备":"bèi","最":"zuì","近":"jìn","法":"fǎ","律":"lǜ","印":"yìn","象":"xiàng","熟":"shú","悉":"xī","不":"bù","仅":"jǐn","性":"xìng","格":"gé","玩":"wán","笑":"xiào","从":"cóng","来":"lái","好":"hǎo","共":"gòng","同":"tóng","适":"shì","合":"hé","幸":"xìng","福":"fú","生":"shēng","活":"huó","浪":"làng","漫":"màn","缺":"quē","点":"diǎn","接":"jiē","受":"shòu","羡":"xiàn","慕":"mù","爱":"ài","情":"qíng","即":"jí","使":"shǐ","加":"jiā","班":"bān","自":"zì","然":"rán","原":"yuán","因":"yīn","互":"hù","相":"xiāng","吸":"xī","引":"yin","幽":"yōu","默":"mò","脾":"pi","气":"qì","应":"yìng","平":"píng","短":"duǎn","信":"xìn","正":"zhèng","聚":"jù","会":"huì","联":"lián","差":"chā","专":"zhuān","门":"mén","毕":"bì","业":"yè","像":"xiàng","重":"zhòng","新":"xīn","尽":"jìn","管":"guǎn","真":"zhēn","谊":"yì","丰":"fēng","富":"fù","无":"wú","聊":"liáo","讨":"tǎo","厌":"yàn","周":"zhōu","围":"wéi","交":"jiāo","流":"liú","理":"lǐ","镜":"jìng","困":"kùn","及":"jí","紧":"jǐn","张":"zhāng","心":"xīn","力":"lì","招":"zhāo","聘":"pìn","提":"tí","供":"gōng","负":"fù","责":"zé","本":"běn","材":"cái","料":"liào","符":"fú","通":"tōng","知":"zhī","另":"lìng","外":"wài","收":"shōu","入":"rù","咱":"zán","们":"men","安":"ān","排":"pái","首":"shǒu","先":"xiān","式":"shì","其":"qí","次":"cì","诚":"chéng","实":"shí","改":"gǎi","变":"biàn","感":"gǎn","判":"pàn","断":"duàn","顾":"gù","客":"kè","约":"yuē","为":"wéi","全":"quán","调":"diào","查":"chá","计":"jì","划":"huà","前":"qián","保":"bǎo","证":"zhèng","醒":"xǐng","意":"yì","积":"jī","累":"lěi","验":"yàn","切":"qiè","按":"àn","照":"zhào","功":"gōng","顺":"shùn","利":"lì","谢":"xiè","消":"xiāo","息":"xi","奖":"jiǎng","金":"jīn","资":"zī","方":"fāng","识":"shi","甚":"shèn","至":"zhì","任":"rèn","家":"jiā","具":"jù","沙":"shā","打":"dǎ","折":"zhé","价":"jià","质":"zhì","量":"liàng","肯":"kěn","行":"xíng","便":"biàn","在":"zài","制":"zhì","冷":"lěng","效":"xiào","邀":"yāo","请":"qǐng","葡":"pú","萄":"táo","艺":"yì","术":"shù","广":"guǎng","味":"wèi","优":"yōu","际":"jì","考":"kǎo","虑":"lǜ","标":"biāo","样":"yàng","年":"nián","龄":"líng","费":"fèi","购":"gòu","物":"wù","尤":"yóu","到":"dào","何":"hé","汁":"zhī","售":"shòu","货":"huò","员":"yuán","袜":"wà","扰":"rǎo","竟":"jìng","西":"xī","红":"hóng","柿":"shì","百":"bǎi","分":"fēn","之":"zhī","皮":"pí","肤":"fū","处":"chù","面":"miàn","值":"zhí","动":"dòng","免":"miǎn","修":"xiū","支":"zhī","持":"chí","举":"jǔ","中":"zhōng","小":"xiǎo","说":"shuō","卡":"kǎ","获":"huò","况":"kuàng","例":"lì","办":"bàn","降":"jiàng","低":"dī","血":"xiě","候":"hòu","估":"gū","咳":"ké","嗽":"sou","严":"yán","窗":"chuāng","户":"hu","空":"kōng","抽":"chōu","烟":"yān","出":"chū","后":"hòu","悔":"huǐ","反":"fǎn","对":"duì","大":"dà","夫":"fu","植":"zhí","研":"yán","究":"jiū","超":"chāo","过":"guò","散":"sàn","步":"bù","精":"jīng","神":"shén","教":"jiào","授":"shòu","数":"shù","明":"míng","要":"yào","是":"shì","减":"jiǎn","肥":"féi","辛":"xīn","苦":"kǔ","肚":"dù","恼":"nǎo","巧":"qiǎo","克":"kè","亲":"qīn","戚":"qi","伤":"shāng","愉":"yú","景":"jǐng","色":"sè","放":"fàng","松":"sōng","压":"yā","回":"huí","忆":"yì","只":"zhǐ","傅":"fu","馆":"guǎn","堵":"dǔ","车":"chē","距":"jù","耐":"nài","命":"mìng","态":"tài","度":"dù","此":"cǐ","科":"kē","往":"wǎng","阳":"yáng","光":"guāng","极":"jí","饼":"bǐng","干":"gān","坚":"jiān","弃":"qì","主":"zhǔ","网":"wǎng","球":"qiú","国":"guó","轻":"qīng","随":"suí","当":"dāng","确":"què","想":"xiǎng","勇":"yǒng","敢":"gǎn","结":"jié","失":"shī","败":"bài","程":"chéng","总":"zǒng","历":"lì","许":"xǔ","区":"qū","暂":"zàn","礼":"lǐ","拜":"bài","母":"mǔ","永":"yǒng","远":"yuǎn","向":"xiàng","秀":"xiù","硕":"shuò","士":"shì","翻":"fān","译":"yì","兴":"xìng","奋":"fèn","建":"jiàn","议":"yì","职":"zhí","键":"jiàn","将":"jiāng","展":"zhǎn","济":"jì","条":"tiáo","件":"jiàn","由":"yóu","于":"yú","比":"bǐ","橡":"xiàng","答":"dá","案":"àn","厉":"lì","害":"hài","语":"yǔ","词":"cí","阅":"yuè","读":"dú","复":"fù","杂":"zá","填":"tián","否":"fǒu","则":"zé","厅":"tīng","论":"lùn","志":"zhì","著":"zhù","增":"zēng","文":"wén","章":"zhāng","内":"nèi","容":"róng","而":"ér","看":"kàn","序":"xù","养":"yǎng","彩":"cǎi","规":"guī","惜":"xī","部":"bù","也":"yě","商":"shāng","并":"bìng","且":"qiě","护":"hù","用":"yòng","详":"xiáng","细":"xì","释":"shì","叶":"yè","育":"yù","言":"yán","直":"zhí","起":"qǐ","误":"wù","事":"shì","半":"bàng","倍":"bèi","节":"jié","务":"wù","见":"jiàn","仔":"zǐ","达":"dá","剧":"jù","演":"yǎn","观":"guān","众":"zhòng","概":"gài","偶":"ǒu","尔":"ěr","吃":"chī","惊":"jīng","基":"jī","础":"chǔ","常":"cháng","申":"shēn","趣":"qù","继":"jì","续":"xù","餐":"cān","纸":"zhǐ","袋":"dài","进":"jìn","错":"cuò","着":"zháo","十":"shí","普":"pǔ","稍":"shāo","微":"wēi","毛":"máo","巾":"jīn","牙":"yá","膏":"gāo","污":"wū","染":"rǎn","卫":"wèi","抱":"bào","歉":"qiàn","盒":"hé","速":"sù","地":"dì","既":"jì","目":"mù","的":"dì","塑":"sù","鼓":"gǔ","励":"lì","拒":"jù","绝":"jué","温":"wēn","乘":"chéng","坐":"zuò","垃":"lā","圾":"jī","桶":"tǒng","美":"měi","丽":"lì","弹":"táng","钢":"āng","琴":"qín","孙":"sūn","寒":"hán","假":"jià","父":"fù","闹":"nào","钟":"zhōng","厕":"cè","批":"pī","评":"píng","针":"zhēn","扬":"yáng","千":"qiān","万":"wàn","怀":"huái","疑":"yí","故":"gù","整":"zhěng","童":"tóng","左":"zuǒ","右":"yòu","粗":"cū","骄":"jiāo","傲":"ào","羞":"xiū","博":"bó","签":"qiān","报":"bào","传":"chuán","号":"hào","码":"mǎ","参":"cān","激":"jī","伙":"huǒ","记":"jì","者":"zhě","代":"dài","恐":"kǒng","怕":"pà","郊":"jiāo","底":"dǐ","导":"dǎo","游":"yóu","貌":"mào","谅":"liàng","预":"yù","习":"xí","马":"mǎ","虎":"hu","静":"jìng","视":"shì","尊":"zūn","凉":"liáng","热":"rè","播":"bō","暑":"shǔ","口":"kǒu","队":"duì","泼":"pō","社":"shè","竞":"jìng","争":"zhēng","森":"sēn","林":"lín","暖":"nuǎn","和":"hé","海":"hǎi","洋":"yáng","人":"rén","鱼":"yú","公":"gōng","里":"lǐ","仍":"réng","列":"liè","落":"luò","技":"jì","了":"liǎo","日":"rì","密":"mì","允":"yǔn","危":"wēi","险":"xiǎn","警":"jǐng","察":"chá","矿":"kuàng","泉":"quán","水":"shuǐ","付":"fù","款":"kuǎn","迷":"mí","路":"lù","址":"zhǐ","世":"shì","纪":"jì","邮":"yóu","局":"jú","封":"fēng","站":"zhàn","期":"qī","饺":"jiǎo","包":"bāo","零":"líng","钱":"qián","呼":"hu","眼":"yǎn","舞":"wǔ","蹈":"dǎo","籍":"jí","胳":"gē","膊":"bo","东":"dōng","占":"zhàn","线":"xiàn","乒":"pīng","乓":"pāng","羽":"yǔ","禁":"jìn","止":"zhǐ","座":"zuò","位":"wèi","油":"yóu","航":"háng","推":"tuī","迟":"chí","高":"gāo","登":"dēng","机":"jī","牌":"pái","都":"dū","旅":"lǚ","怜":"lián","烤":"kǎo","鸭":"yā","祝":"zhù","贺":"hè","民":"mín","族":"zú","扮":"ban","话":"huà","钥":"yào","匙":"shi","拾":"shi","末":"mò","算":"suàn","戏":"xì","急":"jí","南":"nán","图":"tú","易":"yì","太":"tài","秘":"mì","书":"shū","室":"shì","还":"hái","爬":"pá","山":"shān","裤":"kù","衬":"chèn","衫":"shān","鲜":"xiān","饮":"yǐn","或":"huò","舒":"shū","服":"fú","赛":"sài","片":"piàn","级":"jí","聪":"cōng","努":"nǔ","市":"shì","蛋":"dàng","糕":"āo","认":"rèn","烧":"shāo","冒":"mào","季":"jì","春":"chūn","夏":"xià","裙":"qún","突":"tū","刚":"gāng","才":"cái","忙":"máng","白":"bai","锻":"duàn","炼":"liàn","音":"yīn","园":"yuán","睡":"shuì","银":"yín","婚":"hūn","欢":"huān","迎":"yíng","满":"mǎn","电":"diàn","梯":"tī","熊":"xióng","猫":"māo","上":"shàng","洗":"xǐ","手":"shǒu","几":"jī","乎":"hū","化":"huà","健":"jiàn","康":"kāng","担":"dān","较":"jiào","影":"yǐng","响":"xiǎng","个":"gè","史":"shǐ","介":"jiè","环":"huán","境":"jìng","附":"fù","典":"diǎn","束":"shù","忘":"wàng","铁":"tiě","筷":"kuài","啤":"pí","酒":"jiǔ","瓶":"píng","笔":"bǐ","脑":"nǎo","惯":"guàn","李":"li","箱":"xiāng","己":"jǐ","飞":"fēi","司":"sī","需":"xū","黑":"hēi","板":"bǎn","终":"zhōng","爷":"yé","奶":"nǎi","遇":"yù","边":"biān","去":"qù","般":"bān","愿":"yuàn","该":"gāi","长":"zhǎng","扫":"sǎo","净":"jìng","冰":"bīng","澡":"zǎo","月":"yuè","亮":"liang","盘":"pán","刮":"guā","风":"fēng","叔":"shū","阿":"ā","姨":"yí","声":"shēng","菜":"cài","香":"xiāng","蕉":"jiāo","留":"liú","练":"liàn","句":"jù","他":"tā","求":"qiú","注":"zhù","除":"chú","闻":"wén","界":"jiè","街":"jiē","城":"chéng","鞋":"xié","帽":"mào","斤":"jīn","鼻":"bí","头":"tou","检":"jiǎn","刷":"shuā","邻":"lín","居":"jū","选":"xuǎn","择":"zé","冬":"dōng","必":"bì","须":"xū","根":"gēn","据":"jù","奇":"qí","怪":"guài","耳":"ěr","朵":"duo","秋":"qiū","黄":"huáng","河":"hé","绩":"jì","么":"me","租":"zū","饭":"fàng","汉":"hàn","火":"huǒ","米":"mǐ","女":"nǚ","漂":"piào","苹":"píng","店":"diàn","午":"wǔ","什":"shén","我":"wǒ","喜":"xǐ","下":"xià","雨":"yǔ","姐":"jiě","星":"xīng","衣":"yī","医":"yī","院":"yuàn","椅":"yǐ","再":"zài","怎":"zěn","桌":"zhuō","昨":"zuó","宾":"bīng","篮":"lán","但":"dàn","弟":"di","第":"dì","非":"fēi","哥":"gē","汽":"qì","孩":"hái","场":"chǎng","鸡":"jī","绍":"shào","咖":"kā","啡":"fēi","始":"shǐ","试":"shì","妹":"mèi","男":"nán","牛":"niú","旁":"páng","跑":"pǎo","宜":"yi","妻":"qī","床":"chuáng","病":"bìng","跳":"tiào","晚":"wǎn","问":"wèn","题":"tí","瓜":"guā","休":"xiū","颜":"yán","睛":"jing","羊":"yáng","肉":"ròu","思":"sī","泳":"yǒng","运":"yùn","早":"zǎo","丈":"zhàng","台":"tái","恩":"ēn","委":"wěi","瘫":"tān","痪":"huàn","杀":"shā","怨":"yuan","姻":"yīn","吵":"chǎo","架":"jià","敬":"jìng","暗":"àn","肩":"jiān","膀":"bǎng","指":"zhǐ","歪":"wāi","扭":"niǔ","叙":"xù","述":"shù","等":"děng","待":"dài","蚊":"wén","夜":"yè","婆":"po","患":"huàn","与":"yǔ","辈":"bèi","农":"nóng","村":"cūn","屋":"wū","姥":"lǎo","舅":"jiù","姑":"gū","装":"zhuāng","强":"qiáng","烈":"liè","悄":"qiāo","被":"bèi","途":"tú","灰":"huī","尘":"chén","立":"lì","刻":"kè","卧":"wò","泪":"lèi","稳":"wěn","愁":"chóu","帆":"fān","船":"chuán","蓄":"xù","二":"èr","虹":"hóng","括":"kuò","辞":"cí","驾":"jià","驶":"shǐ","轮":"lún","傍":"bàng","盼":"pàn","陆":"lù","各":"gè","闪":"shǎn","拥":"yōng","阶":"jiē","未":"wèi","孝":"xiào","战":"zhàn","足":"zú","惭":"cán","愧":"kuì","屈":"qu","听":"ting","勤":"qín","背":"bèi","团":"tuán","圆":"yuán","君":"jūn","领":"lǐng","恳":"kěn","就":"jiù","古":"gǔ","德":"dé","食":"shí","悠":"yōu","久":"jiǔ","载":"zǎi","形":"xíng","状":"zhuàng","描":"miáo","写":"xiě","赞":"zàn","姓":"xìng","充":"chōng","产":"chǎn","善":"shàn","良":"liáng","治":"zhì","疗":"liáo","躲":"duǒ","藏":"cáng","布":"bù","独":"dú","映":"yìng","珍":"zhēn","珠":"zhū","岩":"yán","石":"shí","角":"jiǎo","势":"shì","夕":"xī","守":"shǒu","岁":"suì","骨":"gǔ","奈":"ài","英":"yīng","雄":"xióng","俊":"jùn","询":"xún","替":"tì","造":"zào","灾":"zāi","熬":"áo","赶":"gǎn","娘":"iang","盆":"pén","似":"sì","射":"shè","击":"jī","纷":"fēn","义":"yì","鞭":"biān","炮":"pào","俗":"sú","盲":"máng","智":"zhì","慧":"huì","兵":"bīng","寻":"xún","找":"zhǎo","齿":"chǐ","胡":"hú","尾":"wěi","巴":"ba","绳":"shéng","扇":"shàn","军":"jūn","猎":"liè","忽":"hū","姿":"zī","贯":"uàn","连":"lián","属":"shǔ","朝":"zhāo","三":"sān","暮":"mù","四":"sì","汇":"huì","固":"gù","构":"gòu","综":"zōng","哲":"zhé","寓":"yù","喂":"wèi","猴":"hóu","宠":"chǒng","彼":"bǐ","蔬":"shū","粮":"liáng","庭":"tíng","财":"cái","省":"shěng","限":"xiàn","淘":"táo","馒":"mán","亏":"kuī","慰":"wèi","显":"xiǎn","尚":"shàng","讲":"jiǎng","均":"jūn","豪":"háo","华":"huá","临":"lín","唤":"huàn","档":"dàng","胃":"wèi","存":"cún","曾":"céng","朦":"méng","胧":"lóng","迹":"jì","绕":"rào","奔":"bēn","辩":"biàn","青":"qīng","蛙":"wā","脖":"bó","摄":"shè","操":"cāo","艰":"jiān","逐":"zhú","渐":"jiàn","兄":"xiōng","念":"niàn","瞬":"shùn","类":"lèi","渡":"dù","享":"xiǎng","慌":"huāng","绪":"xù","致":"zhì","眠":"mián","采":"cǎi","柔":"róu","帘":"lián","品":"pǐn","模":"mó","仿":"fǎng","避":"bì","统":"tǒng","颠":"diān","宝":"bǎo","贝":"bèi","宣":"xuān","册":"cè","召":"zhào","伴":"bàn","裁":"cái","覆":"fù","盖":"gài","移":"yí","企":"qǐ","称":"chēng","霸":"bà","创":"chuàng","营":"yíng","销":"xiāo","裔":"yì","训":"xùn","乏":"fá","项":"xiàng","启":"qǐ","栏":"láng","杆":"ān","投":"tóu","氛":"fēn","器":"qì","畅":"chàng","幼":"yòu","维":"wéi","佛":"fú","阻":"zǔà","碍":"i","组":"zǔ","筑":"zhù","谓":"wèi","泛":"fàn","厢":"xiāng","走":"zǒu","廊":"láng","竹":"zhú","闭":"bì","劳":"láo","矛":"máo","盾":"dùn","谈":"tán","敌":"dí","令":"lìng","阵":"zhèn","挑":"tiǎo","胆":"dǎn","鬼":"guǐ","胜":"shèng","谣":"yáo","糊":"hú","涂":"tú","元":"yuán","攻":"ōng","贵":"guì","讽":"fěng","刺":"cì","灵":"líng","波":"bō","型":"xíng","靠":"kào","纳":"nà","析":"xī","跟":"gēn","踪":"zōng","晰":"xī","补":"bǔ","偿":"cháng","趋":"qū","异":"yì","纵":"zòng","苗":"miáo","借":"jiè","取":"qǔ","措":"cuò","施":"shī","峰":"fēng","迅":"xùn","深":"shēn","妆":"zhuāng","魅":"mèi","糟":"zāo","依":"yī","荐":"jiàn","淋":"lín","漓":"lí","幕":"mù","宁":"nìng","集":"jí","欣":"xīn","赏":"shǎng","丑":"chǒu","陋":"lòu","设":"shè","余":"yú","婴":"yīng","猩":"xīng","鸦":"yā","份":"fen","辨":"biàn","哪":"nǎ","素":"sù","置":"zhi","含":"hán","域":"yù","跃":"yuè","乡":"xiāng","萝":"luó","卜":"bo","悦":"yuè","淡":"dàn","橘":"jú","炸":"zhá","搅":"jiǎo","拌":"bàn","匀":"yún","叠":"dié","透":"tòu","防":"fáng","酱":"jiàng","版":"bǎn","画":"huà","络":"luò","娱":"yú","毫":"háo","棚":"péng","砖":"zhuān","糙":"cāo","木":"mù","齐":"qí","录":"lù","押":"yā","缘":"yuán","逻":"luó","辑":"ji","死":"sǐ","硬":"yìng","遗":"yí","憾":"hàn","脏":"zàng","抓":"zhuā","输":"shū","旦":"dàn","疾":"jí","初":"chū","痛":"tòng","佩":"pèi","退":"tuì","追":"zhuī","梦":"mèng","转":"zhuǎn","柴":"chái","王":"wáng","宫":"gōng","换":"huàn","巨":"jù","承":"chéng","疼":"téng","私":"sī","倾":"qīng","纯":"chún","遵":"zūn","征":"zhēng","段":"duàn","违":"wéi","矩":"ju","席":"xí","吧":"bā","织":"zhī","让":"ràng","隐":"yǐn","陌":"mò","沟":"gōu","滩":"tān","沉":"chén","忍":"rěn","住":"zhù","访":"fǎng","贴":"tiē","蝴":"hú","蝶":"dié","冠":"guàn","掌":"zhǎng","朗":"lǎng","壮":"zhuàng","闲":"xián","培":"péi","返":"fǎn","恶":"è","劣":"liè","舱":"cāng","肃":"sù","猛":"měng","威":"wēi","胁":"xié","衡":"héng","渊":"yuān","览":"lǎn","抖":"dǒu","摔":"shuāi","倒":"dǎo","妇":"fùn","丝":"sī","谨":"jǐn","慎":"shèn","彻":"chè","碌":"lù","奴":"nú","隶":"lì","虚":"xū","伪":"wěi","丛":"cóng","耽":"dān","罪":"zuì","魂":"hún","疲":"pí","倡":"chàng","骤":"zhòu","寂":"jì","寞":"mò","率":"lǜ","棋":"qí","损":"sǔn","挥":"huī","把":"bǎ","握":"wò","索":"suǒ","舍":"shě","范":"fàn","侣":"lǚ","订":"dìng","执":"zhí","池":"chí","润":"rùn","媒":"méi","脆":"cuì","垄":"lǒng","霉":"méi","促":"cù","妨":"fáng","益":"yì","饱":"bǎo","丁":"dīng","延":"yán","妙":"miào","鲶":"nián","逃":"táo","旺":"wàng","盛":"shèng","核":"hé","挖":"wā","掘":"jué","潜":"qián","槛":"kǎn","编":"biān","恋":"liàn","迫":"pò","犹":"yóu","豫":"yù","狡":"jiǎo","猾":"huá","缩":"suō","谦":"qiān","践":"jiàn","洪":"hóng","震":"zhèn","破":"pò","坏":"huài","漠":"mò","夸":"kuā","源":"yuán","祸":"huò","厂":"chǎng","燃":"rán","煤":"méi","炭":"tàn","敏":"mǐng","幻":"huàn","贡":"gòng","献":"xiàn","缓":"huǎn","繁":"fán","荣":"róng","挤":"jǐ","扩":"kuò","归":"guī","咨":"zī","旬":"xún","赔":"péi","政":"zhèng","府":"fǔ","革":"gé","厦":"shà","触":"chù","翅":"chì","昆":"kūn","虫":"chóng","唯":"wéi","梳":"shū","滑":"huá","寄":"jì","皂":"zào","种":"zhǒng","岛":"dǎo","屿":"yǔ","更":"gēng","鸟":"niǎo","塘":"táng","鹰":"yīng","燥":"zào","炎":"yán","凌":"líng","肌":"jī","恢":"huī","湿":"shī","荫":"yìn","汗":"hàn","腺":"xiàn","孔":"kǒng","控":"kòng","玻":"bō","璃":"li","测":"cè","枝":"zhī","蒸":"zhēng","腾":"téng","殊":"shū","秩":"zhì","斗":"dòu","剪":"jiǎn","刀":"dāo","饰":"shì","暴":"bào","抢":"qiǎng","救":"jiù","潮":"cháo","艳":"yàn","昙":"tán","花":"huā","庆":"qìng","菊":"jú","悲":"bēi","叛":"pàn","嚷":"rǎng","胎":"tāi","屏":"píng","懿":"yì","番":"fān","邓":"dèng","嗓":"sǎng","枚":"méi","昌":"chāng","贸":"mào","劲":"jìn","攀":"pān","甘":"gān","罐":"guàn","啬":"sè","僧":"sēng","沈":"shěn","筝":"zhēng","雀":"què","帛":"bó","滴":"dī","卢":"lú","萍":"píng","娥":"é","贫":"pín","雁":"yàn","惰":"duò","豆":"dòu","鹅":"é","赠":"zèng","贷":"dài","凤":"fèng","泣":"qì","仇":"chóu","截":"jié","笛":"dí","鹿":"lù","账":"zhàng","嫌":"xián","托":"tuō","哆":"duō","汴":"biàn","丧":"sàng","誓":"shì","骼":"gé","凶":"xiōng","憎":"zēng","宗":"zōng","谀":"yú","哨":"shào","币":"bì","雾":"wù","寿":"shòu","卵":"luǎn","芳":"fāng","韧":"rèn","奏":"zòu","川":"chuān","袖":"xiù","驳":"bó","兜":"dōu","刹":"shā","镁":"měi","爪":"zhǎo","绚":"xuàn","碚":"bèi","麦":"mài","愣":"lèng","拙":"zhuō","氧":"yǎng","挫":"cuò","凰":"huáng","壕":"háo","臭":"chòu","疫":"yì","辜":"gū","婉":"wǎn","卒":"zú","畏":"wèi","皇":"huáng","椒":"jiāo","婺":"wù","捉":"zhuō","兽":"shòu","策":"cè","桨":"jiǎng","惠":"huì","嘱":"zhǔ","挪":"nuó","薪":"xīn","檐":"yán","辽":"liáo","徽":"huī","鸣":"míng","铭":"míng","绸":"chóu","茧":"jiǎn","贪":"tān","俱":"jù","抗":"kàng","遂":"suì","逸":"yì","魏":"wèi","嵩":"sōng","捕":"bǔ","葱":"cōng","坷":"kě","秤":"chèng","摘":"zhāi","忠":"zhōng","朽":"xiǔ","霄":"xiāo","涛":"tāo","惩":"chéng","牵":"qiān","晏":"yàn","杜":"dù","晓":"xiǎo","侵":"qīn","吉":"jí","巢":"cháo","厘":"lí","哦":"ó","艾":"ài","烁":"shuò","贼":"zéi","锢":"gù","歼":"jiān","牡":"mǔ","亡":"wáng","臃":"yōng","狮":"shī","昏":"hūn","枕":"zhěn","嘲":"cháo","诺":"nuò","锤":"chuí","蜷":"quán","渺":"miǎo","凳":"dèng","楷":"kǎi","拱":"gǒng","嗡":"wēng","杭":"háng","溶":"róng","寸":"cùn","伦":"lún","恰":"qià","鞍":"ān","窜":"cuàn","弓":"gōng","岳":"yuè","堪":"kān","罚":"fá","绽":"zhàn","仪":"yí","啄":"zhuó","屑":"xiè","撑":"chēng","斯":"sī","胫":"jìng","拼":"pīn","廉":"lián","嚏":"tì","忌":"jì","淹":"yān","陛":"bì","谭":"tán","宏":"hóng","栽":"zāi","胤":"yìn","匆":"cōng","孕":"yùn","廷":"tíng","谷":"gǔ","滋":"zī","旋":"xuán","烛":"zhú","涌":"yǒng","夹":"jiā","江":"jiāng","迁":"qiān","甫":"fǔ","涉":"shè","御":"yù","浑":"hún","岭":"lǐng","频":"pín","爽":"shuǎng","刘":"liú","鸫":"dōng","诫":"jiè","爆":"bào","绣":"xiù","谎":"huǎng","赵":"zhào","廖":"liào","抄":"chāo","钉":"dīng","遥":"yáo","翔":"xiáng","焉":"yān","淮":"huái","棉":"mián","筋":"jīn","壤":"rǎng","窝":"wō","罕":"hǎn","滨":"bīn","匡":"kuāng","遭":"zāo","勺":"sháo","削":"xuē","疆":"jiāng","砚":"yàn","竭":"jié","坠":"zhuì","端":"duān","匠":"jiàng","惬":"qiè","筒":"tǒng","股":"gǔ","跋":"bá","狐":"hú","曹":"cáo","抵":"dǐ","巅":"diān","井":"jǐng","抹":"mǒ","娶":"qǔ","桔":"jú","驰":"chí","毯":"tǎn","堂":"táng","繇":"yáo","惑":"huò","混":"hùn","筛":"shāi","苛":"kē","夺":"duó","洛":"luò","氏":"shì","滥":"làn","洽":"qià","帝":"dì","宇":"yǔ","闷":"mèn","枯":"kū","宿":"sù","扎":"zhā","凡":"fán","俘":"fú","孵":"fū","壳":"ké","沿":"yán","瞌":"kē","泊":"pō","禽":"qín","巩":"gǒng","愚":"yú","罗":"luó","腹":"fù","逼":"bī","撒":"sā","柱":"zhù","鲨":"shā","宅":"zhái","蚁":"yǐ","粒":"lì","荡":"dàng","昼":"zhòu","臂":"bì","盏":"zhǎn","晨":"chén","熙":"xī","阔":"kuò","链":"liàn","蝉":"chán","翼":"yì","蛇":"shé","枪":"qiāng","掏":"tāo","晾":"liàng","喻":"yù","沸":"fèi","栩":"xǔ","纹":"wén","铅":"qiān","隋":"suí","盯":"dīng","躯":"qū","卷":"juǎn","藩":"fān","俪":"lì","吴":"wú","焰":"yàn","涓":"juān","锐":"ruì","予":"yǔ","械":"xiè","讯":"xùn","绊":"bàn","亭":"tíng","沮":"jǔ","坊":"fāng","柜":"guì","裕":"yù","灌":"guàn","瓣":"bàn","旱":"hàn","惫":"bèi","萦":"yíng","障":"zhàng","墨":"mò","疏":"shū","恺":"kǎi","尖":"jiān","翁":"wēng","祁":"qí","软":"ruǎn","琉":"liú","缅":"miǎn","吾":"wú","州":"zhōu","牢":"láo","割":"gē","俯":"fǔ","铛":"dāng","圳":"zhèn","髦":"máo","茂":"mào","抚":"fǔ","逾":"yú","讶":"yà","邦":"bāng","湖":"hú","融":"róng","躁":"zào","肪":"fáng","锦":"jǐn","添":"tiān","溜":"liū","洁":"jié","耕":"gēng","纲":"gāng","莫":"mò","董":"dǒng","蜂":"fēng","蜡":"là","坡":"pō","拧":"níng","塞":"sāi","蔽":"bì","捐":"juān","逢":"féng","鼠":"shǔ","缠":"chán","倦":"juàn","仙":"xiān","舟":"zhōu","挨":"āi","撕":"sī","衔":"xián","鉴":"jiàn","锋":"fēng","垫":"diàn","援":"yuán","昂":"áng","撼":"hàn","曲":"qū","绘":"huì","堕":"duò","孤":"gū","耘":"yún","襟":"jīn","腐":"fǔ","昔":"xī","葛":"gé","咦":"yí","绞":"jiǎo","欺":"qī","吐":"tǔ","砂":"shā","瓦":"wǎ","轨":"guǐ","耀":"yào","郑":"zhèng","陕":"shǎn","塔":"tǎ","穴":"xué","澈":"chè","萨":"sà","振":"zhèn","咐":"fù","嘛":"ma","撤":"chè","嚼":"jué","皱":"zhòu","帚":"zhǒu","搀":"chān","赐":"cì","窘":"jiǒng","毅":"yì","蚂":"mǎ","狸":"lí","洲":"zhōu","钮":"niǔ","俏":"qiào","菲":"fēi","嘿":"hēi","陨":"yǔn","玛":"mǎ","蔓":"màn","隔":"gé","恍":"huǎng","煜":"yù","露":"lù","辟":"pì","坦":"tǎn","杠":"gāng","吁":"xū","吝":"lìn","侧":"cè","橙":"chéng","驮":"tuó","袭":"xí","敷":"fū","驱":"qū","滞":"zhì","径":"jìng","丹":"dān","槟":"bīn","槽":"cáo","撬":"qiào","诊":"zhěn","溪":"xī","帖":"tiē","胶":"jiāo","沛":"pèi","渔":"yú","粘":"zhān","骚":"sāo","荒":"huāng","弛":"chí","配":"pèi","陷":"xiàn","兔":"tù","吩":"fēn","颇":"pǒ","甸":"diān","乍":"zhà","谱":"pǔ","晋":"jìn","粉":"fěn","狼":"láng","趄":"jū","奥":"ào","垂":"chuí","趔":"liè","辉":"huī","怒":"nù","磁":"cí","狭":"xiá","膺":"yīng","储":"chǔ","倚":"yǐ","逝":"shì","擅":"shàn","泽":"zé","稚":"zhì","朔":"shuò","吊":"diào","圣":"shèng","仗":"zhàng","裹":"guǒ","叨":"dāo","驴":"lǘ","拟":"nǐ","栋":"dòng","陈":"chén","霍":"huò","删":"shān","跨":"kuà","冶":"yě","偷":"tōu","亦":"yì","馍":"mó","雅":"yǎ","略":"lüè","坎":"kǎn","绰":"chuò","野":"yě","鸽":"gē","叉":"chā","泡":"pào","杰":"jié","诞":"dàn","浃":"jiā","土":"tǔ","拔":"bá","哄":"hǒng","浏":"liú","釜":"fǔ","武":"wǔ","掰":"bāi","颖":"yǐng","捧":"pěng","愈":"yù","毁":"huǐ","泄":"xiè","奉":"fèng","赤":"chì","竖":"shù","趴":"pā","媳":"xí","讥":"jī","灶":"zào","朴":"pǔ","仓":"cāng","闸":"zhá","谜":"mí","嫦":"cháng","肿":"zhǒng","蒙":"méng","臣":"chén","尬":"gà","亚":"yà","毒":"dú","苏":"sū","滤":"lǜ","耍":"shuǎ","浙":"zhè","崭":"zhǎn","绢":"juàn","坛":"tán","蔚":"wèi","斧":"fǔ","裂":"liè","灿":"càn","兼":"jiān","哞":"mōu","濒":"bīn","拐":"guǎi","衍":"yǎn","浮":"fú","扣":"kòu","誉":"yù","怠":"dài","惹":"rě","酿":"niàng","伟":"wěi","嵌":"qiàn","液":"yè","逛":"guàng","偏":"piān","阆":"láng","悟":"wù","嗜":"shì","弭":"mǐ","协":"xié","眨":"zhǎ","伯":"bó","恒":"héng","旗":"qí","症":"zhèng","兰":"lán","腻":"nì","罢":"bà","嫁":"jià","莲":"lián","贩":"fàn","纠":"jiū","唐":"táng","煌":"huáng","慷":"kāng","稀":"xī","芯":"xīn","眉":"méi","笼":"lóng","妄":"wàng","剑":"jiàn","田":"tián","携":"xié","刊":"kān","缜":"zhěn","浸":"jìn","轰":"hōng","钻":"zuān","奢":"shē","拆":"chāi","拳":"quán","瑟":"sè","摩":"mó","昇":"shēng","纺":"fǎng","惕":"tì","凿":"záo","砰":"pēng","诀":"jué","隆":"lóng","乾":"qián","诠":"quán","吞":"tūn","忧":"yōu","旭":"xù","铜":"tóng","颤":"chàn","蜜":"mì","玫":"méi","嗦":"suo","拖":"tuō","眯":"mī","宵":"xiāo","梅":"méi","歙":"shè","磋":"cuō","秦":"qín","赖":"lài","蕾":"lěi","羿":"yì","苍":"cāng","肺":"fèi","蛀":"zhù","耗":"hào","泥":"ní","跤":"jiāo","衷":"zhōng","舌":"shé","遮":"zhē","郁":"yù","腔":"qiāng","膜":"mó","逮":"dǎi","弯":"wān","岂":"qǐ","锄":"chú","欠":"qiàn","盗":"dào","霜":"shuāng","踏":"tà","缝":"fèng","汰":"tài","撅":"juē","倘":"tǎng","磨":"mó","邪":"xié","芭":"bā","宴":"yàn","嘉":"jiā","脂":"zhī","陵":"líng","汪":"wāng","饥":"jī","稿":"gǎo","呜":"wū","殿":"diàn","庙":"miào","漆":"qī","巷":"xiàng","拢":"lǒng","跌":"diē","庞":"páng","祥":"xiáng","炫":"xuàn","呵":"hē","牧":"mù","凝":"níng","宋":"sòng","呈":"chéng","怖":"bù","欲":"yù","瑰":"guī","循":"xún","韵":"yùn","喷":"pēn","茸":"rōng","尺":"chǐ","愤":"fèn","哗":"huā","陡":"dǒu","芬":"fēn","瞄":"miáo","噪":"zào","粤":"yuè","慨":"kǎi","叹":"tàn","醇":"chún","痒":"yǎng","琐":"suǒ","弥":"mí","祖":"zǔ","泰":"tài","蹦":"bèng","偎":"wēi","榜":"bǎng","捷":"jié","鲁":"lǔ","辅":"fǔ","寺":"sì","缸":"gāng","屉":"tì","豚":"tún","隘":"ài","钙":"gài","惧":"jù","肴":"yáo","壁":"bì","尴":"gān","贬":"biǎn","茁":"zhuó","懈":"xiè","冗":"rǒng","权":"quán","靡":"mí","徐":"xú","椰":"yē","诱":"yòu","咽":"yàn","酷":"kù","稻":"dào","若":"ruò","晃":"huǎng","卑":"bēi","璋":"zhāng","庄":"zhuāng","峭":"qiào","遨":"áo","探":"tàn","暄":"xuān","蠢":"chǔn","菌":"jūn","碑":"bēi","宙":"zhòu","痕":"hén","涵":"hán","逆":"nì","绵":"mián","瘤":"liú","哀":"āi","谐":"xié","欧":"ōu","诸":"zhū","脉":"mài","肠":"cháng","灭":"miè","囚":"qiú","茅":"máo","旷":"kuàng","叟":"sǒu","侥":"jiǎo"};
const KAMUS=(function(){
  const KEY='hanyou_kamus_mode';
  const MODES={'0':{s:'Normal',l:'Normal'},py:{s:'Pinyin',l:'Pinyin'},ar:{s:'Pin+Arti',l:'Pinyin + Arti'}};
  const ORDER=['0','py','ar'];
  const M=()=>{let v=null;try{v=localStorage.getItem(KEY);}catch(e){v=window.__kzm||null;}return v==='py'?'py':(v==='ar'||v==='1')?'ar':'0';};
  const setM=v=>{window.__kzm=v;try{localStorage.setItem(KEY,v);}catch(e){}};
  let seg=null;const S=()=>seg||(seg=kzMake(window.HANYOU_DATA.vocab,KZ_CHARS));
  const body=()=>document.getElementById('latihanSessionBody');
  const examOn=()=>{try{return typeof EXAM!=='undefined'&&!!EXAM.active&&!!EXAM.active();}catch(e){return false;}};
  const live=()=>M()!=='0'&&!examOn();
  const SKIP='.quiz-part-head,.quiz-score-card,.quiz-audio-card,.pm-toolbar,rt,script,style,textarea,input,select,.kz,#kzPop';
  const BLK='.qi-passage,.qi-text',ROOTS='.quiz-item,.pm-group,.pm-zh';
  const TOK=/\s+|[（(][^）)\s]{1,8}[）)]|[\u4e00-\u9fff]|[。！？!?；;]+|[”’」』）)]+|[^\s\u4e00-\u9fff。！？!?；;”’」』）)（(]+|[（(]/g;
  const PUN=/^(?:[，、：:,.…]+|[。！？!?；;]+|[”’」』）)]+)$/;
  const isT=x=>/^[。！？!?；;]+$/.test(x),isC=x=>/^[”’」』）)]+$/.test(x);
  const KEEPCAP=new Set(['北京','中国','汉语','元旦']);
  function fixPy(t,py){return KEEPCAP.has(t)||!/^[A-Z]/.test(py)?py:py.charAt(0).toLowerCase()+py.slice(1);}
  let lw=null;
  function fixAr(a){
    a=String(a).replace(/\s+([,;])/g,'$1').replace(/\s{2,}/g,' ').trim();
    if(!lw){lw=new Set();window.HANYOU_DATA.vocab.forEach(w=>(String(w.arti).match(/[a-z]{3,}/g)||[]).forEach(x=>lw.add(x)));}
    return a.split(/([,;]\s*)/).map((x,i)=>{const m=x.match(/^([A-Z])([a-z]+)/);return m&&(i>0||lw.has((m[1]+m[2]).toLowerCase()))?m[1].toLowerCase()+x.slice(1):x;}).join('');
  }
  let busy=false,raf=0,tm=null;const flex=new WeakMap();
  function strip(b){
    b.querySelectorAll('.kz-tr').forEach(e=>e.remove());
    b.querySelectorAll('.kz-w').forEach(w=>w.replaceWith(...w.childNodes));
    b.querySelectorAll('.kz-g').forEach(g=>g.replaceWith(...g.childNodes));
    b.querySelectorAll('.kz').forEach(e=>e.replaceWith(document.createTextNode(e.textContent)));
    b.querySelectorAll('.kz-p').forEach(e=>e.classList.remove('kz-p'));
    b.querySelectorAll('[data-kz-done]').forEach(e=>e.removeAttribute('data-kz-done'));
    b.normalize();
  }
  function annotate(top){
    const w=document.createTreeWalker(top,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const pe=n.parentElement;if(!pe||pe.closest(SKIP))return 2;return(/[\u4e00-\u9fff]/.test(n.nodeValue)||(pe.closest(BLK)&&/\S/.test(n.nodeValue)))?1:2;}});
    const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
    let root=null,cur='',pend=false,last=null;
    const flush=()=>{if(root&&last&&cur){const k=cur.replace(/\s+/g,''),t=typeof KZ_TR!=='undefined'?KZ_TR[k]:null;if(t){const e=document.createElement('span');e.className='kz-tr';e.dataset.tr=t;const g=last.parentNode&&last.parentNode.classList&&last.parentNode.classList.contains('kz-g')?last.parentNode:last;g.after(e);}}cur='';pend=false;};
    nodes.forEach(n=>{
      const pe=n.parentElement,r=pe.closest(BLK)||pe;
      if(r!==root){flush();root=r;last=null;}
      const f=document.createDocumentFragment();
      const add=(t,hit)=>{
        if(/^\s+$/.test(t)){f.appendChild(document.createTextNode(t));cur+=t;return;}
        let fl=false;if(pend&&!(isT(t)||isC(t))){flush();fl=true;}
        const s=document.createElement('span');s.className='kz';
        if(hit){s.dataset.py=fixPy(t,hit.py);s.dataset.ar=hit.ar||'';s.dataset.lv=hit.lv||'';}
        s.textContent=t;
        const inF=last&&last.parentNode&&(last.parentNode===f||(last.parentNode.classList&&last.parentNode.classList.contains('kz-g')&&last.parentNode.parentNode===f));
        if(PUN.test(t)&&inF&&!fl){let g=last.parentNode.classList&&last.parentNode.classList.contains('kz-g')?last.parentNode:null;if(!g){g=document.createElement('span');g.className='kz-g';last.parentNode.insertBefore(g,last);g.appendChild(last);}g.appendChild(s);}else f.appendChild(s);
        last=s;cur+=t;if(isT(t))pend=true;
      };
      S().segment(n.nodeValue).forEach(p=>{if(p.py)add(p.t,p);else(p.t.match(TOK)||[]).forEach(x=>add(x));});
      let fx=flex.get(pe);if(fx===undefined){fx=pe.classList.contains('qi-opt')||/flex|grid/.test(getComputedStyle(pe).display);flex.set(pe,fx);}
      if(fx){const wr=document.createElement('span');wr.className='kz-w';wr.appendChild(f);n.replaceWith(wr);}else{pe.classList.add('kz-p');n.replaceWith(f);}
    });
    flush();top.setAttribute('data-kz-done','1');
  }
  /* proses bertahap: hanya soal yang tampil / dekat layar yang dibungkus; soal tersembunyi (mis. bacaan ganda di Mode Baca) dilewati */
  function pump(){
    const b=body();if(!b||!live())return;
    const rs=[...b.querySelectorAll(ROOTS)].filter(r=>!r.hasAttribute('data-kz-done'));
    if(!rs.length)return;
    const layout=document.documentElement.getBoundingClientRect().width>0;
    if(!layout){rs.forEach(annotate);return;}   /* lingkungan tanpa tata letak (uji otomatis) */
    const vh=window.innerHeight,mg=700;let n=0,more=false;
    for(const r of rs){
      if(!r.getClientRects().length)continue;
      const rc=r.getBoundingClientRect();
      if(rc.bottom<-mg||rc.top>vh+mg)continue;
      if(n>=4){more=true;break;}
      annotate(r);n++;
    }
    if(more)sched();
  }
  const raf0=window.requestAnimationFrame?window.requestAnimationFrame.bind(window):(f=>setTimeout(f,16));
  function sched(){if(raf)return;raf=raf0(()=>{raf=0;pump();});}
  const tabsOf=()=>[...document.querySelectorAll('#examShell .xs-tabs .xs-sm')];
  const setT=(el,t)=>{if(el&&el.textContent!==t)el.textContent=t;};
  function sync(){
    const m=M(),md=MODES[m];
        const sw=document.getElementById('kzSwSession');if(sw){sw.setAttribute('aria-pressed',m!=='0'?'true':'false');sw.hidden=examOn();setT(sw.querySelector('span'),md.s);}
    document.querySelectorAll('.kz-btn').forEach(b=>{b.dataset.m=m;b.setAttribute('aria-pressed',m!=='0'?'true':'false');b.hidden=examOn();setT(b.querySelector('.kz-lb'),md.s);b.title='Terjemahan: '+md.l+' (ketuk untuk mengganti, tahan untuk memilih)';});
    const tabs=tabsOf(),cur=tabs.find(t=>t.classList.contains('on'));
    if(window.DOCK)window.DOCK.sync();
  }
  function apply(){
    const b=body();if(!b)return;busy=true;
    try{strip(b);const a=live();b.classList.toggle('kz-on',a);b.classList.toggle('kz-ar',a&&M()==='ar');if(a){pump();sched();}}
    finally{setTimeout(()=>{busy=false;},0);}
    mount();sync();
    [0,250,800].forEach(d=>setTimeout(()=>{mount();sync();sched();},d));   /* shell soal dibuat setelah render */
  }
  const vib=n=>{try{navigator.vibrate&&navigator.vibrate(n);}catch(e){}};
  let ft=null;function flash(){const b=body();if(!b)return;b.classList.remove('kz-flash');void b.offsetWidth;b.classList.add('kz-flash');clearTimeout(ft);ft=setTimeout(()=>b.classList.remove('kz-flash'),340);}
  function setMode(v){setM(v);apply();vib(10);flash();if(typeof toast==='function'){try{toast('Terjemahan: '+MODES[v].l);}catch(e){}}}
  function cycle(){setMode(ORDER[(ORDER.indexOf(M())+1)%3]);}
  function pop(e){
    if(e.target.tagName==='INPUT'&&e.target.closest('label'))return;
    let p=document.getElementById('kzPop');if(p)p.remove();
    const b=body();if(!b||!b.classList.contains('kz-ar'))return;
    const k=e.target.closest&&e.target.closest('.kz');if(!k||!k.dataset.py||!k.closest('#latihanSessionBody'))return;
    p=document.createElement('div');p.id='kzPop';
    p.innerHTML='<b class="kz-h">'+escapeHtml(k.textContent)+'</b><span class="kz-p">'+escapeHtml(k.dataset.py)+'</span><span class="kz-a">'+(k.dataset.ar?escapeHtml(fixAr(k.dataset.ar)):'Bagian dari kata lain. Ketuk kata di sekitarnya untuk arti lengkap.')+'</span>'+(k.dataset.lv&&k.dataset.lv!=='0'?'<small>HSK '+escapeHtml(k.dataset.lv)+'</small>':'');
    document.body.appendChild(p);
    const r=k.getBoundingClientRect(),pw=p.offsetWidth,ph=p.offsetHeight;
    let x=Math.min(Math.max(8,r.left+r.width/2-pw/2),innerWidth-pw-8),y=r.bottom+8;
    if(y+ph>innerHeight-8)y=Math.max(8,r.top-ph-8);
    p.style.left=x+'px';p.style.top=y+'px';
  }
  function mount(){
    /* tombol Terjemahan kini ada di dalam tombol pengaturan (DOCK); menu Mode Kamus di halaman paket sudah dihapus */
    const mbar=document.querySelector('#examShell .xs-mbar'),top=document.querySelector('#examShell .xs-top');
    const hd=document.querySelector('#latihanSessionStage .latihan-session-head'),old=document.getElementById('kzSwSession');
    if(mbar||top){if(old)old.remove();}
    else if(hd&&!old)hd.insertAdjacentHTML('beforeend','<button type="button" class="kz-mini" id="kzSwSession" aria-pressed="false" title="Terjemahan">文 <span>Normal</span></button>');
    if(window.DOCK)window.DOCK.mount();
    sync();
  }
  let lp=false,lpt=null;
  function closeMenu(){const m=document.getElementById('kzMenu');if(m)m.remove();}
  function openMenu(btn){
    closeMenu();const m=document.createElement('div');m.id='kzMenu';m.setAttribute('role','menu');
    m.innerHTML=ORDER.map(k=>'<button type="button" role="menuitem" data-kzo="'+k+'" aria-pressed="'+(M()===k)+'">'+MODES[k].l+'</button>').join('');
    document.body.appendChild(m);const r=btn.getBoundingClientRect(),w=m.offsetWidth;
    m.style.left=Math.max(8,Math.min(r.left+r.width/2-w/2,innerWidth-w-8))+'px';m.style.top=(r.bottom+8)+'px';
  }
  document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('.kz-btn');if(!b)return;lp=false;clearTimeout(lpt);lpt=setTimeout(()=>{lp=true;vib(18);openMenu(b);},420);},true);
  ['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(lpt),true));
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.kz-btn'))e.preventDefault();});
  document.addEventListener('click',e=>{
    const t=e.target.closest?e.target:null;if(!t)return;
    if(lp&&t.closest('.kz-btn')){lp=false;return;}
    lp=false;
    const mo=t.closest('#kzMenu [data-kzo]');if(mo){closeMenu();setMode(mo.dataset.kzo);return;}
    if(!t.closest('#kzMenu'))closeMenu();
    if(t.closest('#kzSwSession,.kz-btn')){cycle();return;}
    pop(e);
  });
  document.addEventListener('scroll',sched,true);window.addEventListener('resize',sched);
  /* shell soal & isi soal dibuat/diganti dinamis: pasang tombol dan lanjutkan pemrosesan */
  new MutationObserver(()=>{if(busy)return;clearTimeout(tm);tm=setTimeout(()=>{mount();sched();},90);}).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(()=>sched()).observe(document.body,{attributes:true,subtree:true,attributeFilter:['data-readmode']});
  mount();
  return {apply,toggle:cycle,mount,setMode};
})();
/* DOCK: satu tombol pengaturan -> 4 tombol (Mode Baca, Terjemahan, Bagian, Nomor soal); menutup sendiri setelah beberapa detik */
window.DOCK=(function(){
  const IDLE=4200;
  const S=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
  const IC={
    gear:S('<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" stroke-width="2.4"/><circle class="gk gk1" cx="8" cy="6.5" r="2.6" fill="currentColor" stroke="none"/><circle class="gk gk2" cx="15.5" cy="12" r="2.6" fill="currentColor" stroke="none"/><circle class="gk gk3" cx="8" cy="17.5" r="2.6" fill="currentColor" stroke="none"/>'),
    pk:S('<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>'),
    pm:S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>'),
    kz:S('<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>'),
    mendengar:S('<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>'),
    membaca:S('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
    menulis:S('<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>'),
    grid:S('<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>')
  };
  const NAME={mendengar:'Mendengar',membaca:'Membaca',menulis:'Menulis'};
  let open=false,tm=null,seen=false,prog=false;
  const shell=()=>document.getElementById('examShell');
  const body=()=>document.getElementById('latihanSessionBody');
  const examOn=()=>{try{return typeof EXAM!=='undefined'&&!!EXAM.active&&!!EXAM.active();}catch(e){return false;}};
  const tabs=()=>[...document.querySelectorAll('#examShell .xs-tabs .xs-sm')];
  const kzMode=()=>{let v=null;try{v=localStorage.getItem('hanyou_kamus_mode');}catch(e){v=window.__kzm||null;}return v==='py'?'py':(v==='ar'||v==='1')?'ar':'0';};
  function html(){
    const row=(k,i,ic,label,extra)=>'<button type="button" class="cdk-b'+(k==='kz'?' kz-btn':'')+'" data-k="'+k+'" style="--i:'+i+'"'+(extra||'')+'><span class="cdk-ic">'+ic+'</span><i>'+label+'</i><em class="cdk-st"></em></button>';
    return '<div class="cdk-panel" role="toolbar" aria-label="Pengaturan latihan"><div class="cdk-in">'+
      row('pk',0,IC.pk,'Paket',' aria-label="Pindah paket" title="Pindah paket tanpa kembali ke daftar"')+
      row('pm',1,IC.pm,'Mode Baca',' aria-pressed="false" title="Mode Baca (tampilan seperti lembar ujian)"')+
      row('kz',2,IC.kz,'Terjemahan',' data-m="0" aria-pressed="false" aria-label="Terjemahan"')+
      row('sec',3,'','Bagian',' aria-label="Ganti bagian soal"')+
      row('grid',4,IC.grid,'Nomor soal',' aria-pressed="false" title="Nomor soal"')+
      '<span class="cdk-ver">HANYOU · tampilan v19</span></div><u class="cdk-bar"></u></div>'+
      '<button type="button" class="cdk-gear" aria-label="Pengaturan" aria-expanded="false" title="Pengaturan">'+IC.gear+'<u class="cdk-dot"></u></button>';
  }
  function measure(){}
  function restartBar(){document.querySelectorAll('.cdk-bar').forEach(b=>{b.classList.remove('run');void b.offsetWidth;b.classList.add('run');});}
  function setOpen(v){
    open=!!v;clearTimeout(tm);
    document.querySelectorAll('.cdk').forEach(d=>{
      if(open)measure(d);
      d.classList.toggle('open',open);
      const g=d.querySelector('.cdk-gear');if(g)g.setAttribute('aria-expanded',String(open));
    });
    if(open){restartBar();tm=setTimeout(()=>setOpen(false),IDLE);}
  }
  function poke(){if(!open)return;clearTimeout(tm);restartBar();tm=setTimeout(()=>setOpen(false),IDLE);}
  function mount(){
    const s=shell();if(!s)return;
    [['.xs-top',true]].forEach(([sel,isTop])=>{
      const bar=s.querySelector(sel);if(!bar)return;
      let d=bar.querySelector(':scope>.cdk');
      if(!d){
        d=document.createElement('div');d.className='cdk';d.innerHTML=html();
        const fin=isTop&&bar.querySelector('.xs-finish');
        if(fin)bar.insertBefore(d,fin);else bar.appendChild(d);
        if(open){measure(d);d.classList.add('open');const g=d.querySelector('.cdk-gear');if(g)g.setAttribute('aria-expanded','true');restartBar();}
        else if(!seen){seen=true;d.classList.add('hello');setTimeout(()=>d.classList.remove('hello'),2200);}
      }
    });
    s.querySelectorAll('.xs-mbar .cdk').forEach(x=>x.remove());
    s.classList.add('cdk-on');
    sync();
  }
  function sync(){
    const s=shell();if(!s)return;
    const b=body(),hasPm=!!b&&b.hasAttribute('data-readmode'),pmOn=hasPm&&b.getAttribute('data-readmode')==='paper';
    const tb=tabs(),cat=s.dataset.cat||'membaca',ex=examOn(),km=kzMode();
    const dn=s.querySelector('.xs-count [data-done]'),tt=s.querySelector('.xs-count [data-total]');
    const pc=dn&&tt?String(Math.min(100,Math.round((+dn.textContent||0)/Math.max(1,+tt.textContent||1)*100))):'0';
    const navOn=s.classList.contains('nav-open');
    const ce=s.querySelector('.xs-code b'),codeNow=ce?ce.textContent:'';
    document.querySelectorAll('#examShell .cdk').forEach(d=>{
      const q=k=>d.querySelector('.cdk-b[data-k="'+k+'"]');
      const st=(el,t)=>{const e=el&&el.querySelector('.cdk-st');if(e&&e.textContent!==t)e.textContent=t;};
      const pk=q('pk');if(pk)pk.hidden=ex||!tb.length;
      const pm=q('pm');if(pm){pm.hidden=!hasPm;pm.setAttribute('aria-pressed',String(pmOn));st(pm,pmOn?'Aktif':'Mati');}
      st(pk,codeNow);
      const kz=q('kz');if(kz){kz.hidden=ex;kz.dataset.m=km;kz.setAttribute('aria-pressed',km!=='0'?'true':'false');st(kz,km==='py'?'Pinyin':km==='ar'?'Pinyin + Arti':'Normal');}
      const sc=q('sec');if(sc){
        sc.hidden=ex||!tb.length;
        if(sc.dataset.cat!==cat){sc.dataset.cat=cat;sc.querySelector('.cdk-ic').innerHTML=IC[cat]||IC.membaca;}
        st(sc,NAME[cat]||'');
        sc.title='Ganti bagian soal (sekarang: '+(NAME[cat]||cat)+')';
      }
      const gr=q('grid');if(gr){gr.setAttribute('aria-pressed',String(navOn));st(gr,(dn?dn.textContent:'0')+'/'+(tt?tt.textContent:'0'));if(gr.dataset.kzp!==pc){gr.dataset.kzp=pc;gr.style.setProperty('--kzp',pc);}}
      d.classList.toggle('has-on',(pmOn||(km!=='0'&&!ex)));
    });
  }

  /* ===== Pindah paket dari dalam sesi (tanpa kembali ke daftar paket) ===== */
  const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function closePaket(){const e=document.getElementById('pksSheet');if(!e)return;e.classList.remove('in');setTimeout(()=>e.remove(),220);}
  function curPaketId(){try{return (latihanSet&&latihanSet.id)||latihanActivePaketId||null;}catch(e){return null;}}
  function goPaket(id,cat){
    closePaket();
    if(id===curPaketId())return;
    try{
      const p=getAllPaket().find(x=>x.id===id);
      const has=p&&p.skills.some(k=>k.cat===cat);
      const c=has?cat:(p&&p.skills[0]&&p.skills[0].cat)||cat;
      closeLatihanSession();
      latihanActivePaketId=id;
      openLatihanSession(c,id,'paket');
      if(typeof toast==='function'&&p)toast(p.examCode+' · '+(LATIHAN_LABELS[c]||c));
    }catch(e){try{console.warn('DOCK paket',e);}catch(_){}}
  }
  function paketCards(level,cat,cur){
    const list=getAllPaket().filter(p=>p.level===level);
    return list.map((p,i)=>{
      const r=latihanSkillProgress(p.id,cat),has=p.skills.some(k=>k.cat===cat);
      const col=(typeof CH_COLORS!=='undefined'&&CH_COLORS[i%CH_COLORS.length])||'var(--accent)';
      return '<button type="button" class="pks-c'+(p.id===cur?' cur':'')+(r.pct>=100?' done':'')+'" data-id="'+esc(p.id)+'"'+(p.id===cur?' aria-current="true"':'')+'>'
        +'<span class="pks-n" style="background:'+col+'">'+p.displayNo+'</span>'
        +'<span class="pks-t"><b>'+esc(p.examCode)+'</b><small>'+(has?(r.done+'/'+r.total+' soal'):'tidak ada bagian ini')+'</small>'
        +'<span class="pks-bar"><i style="width:'+(has?r.pct:0)+'%;background:'+col+'"></i></span></span>'
        +'<em>'+(p.id===cur?'Dibuka':(r.pct>=100?'✓':(has?r.pct+'%':'')))+'</em></button>';
    }).join('');
  }
  function openPaket(){
    const s=shell();if(!s||typeof getAllPaket!=='function')return;
    closePaket();
    const cat=s.dataset.cat||'membaca',cur=curPaketId();
    const all=getAllPaket(),me=all.find(p=>p.id===cur);
    const levels=[...new Set(all.map(p=>p.level))];
    let level=(me&&me.level)||levels[0];
    const el=document.createElement('div');el.id='pksSheet';el.className='pks';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Pindah paket');
    el.innerHTML='<div class="pks-bg"></div><div class="pks-card"><div class="pks-grab"></div>'
      +'<div class="pks-h"><span><b>Pindah paket</b><small>Tetap di bagian '+esc(NAME[cat]||cat)+'</small></span><button type="button" class="pks-x" aria-label="Tutup">'+S('<path d="M6 6l12 12M18 6L6 18"/>')+'</button></div>'
      +(levels.length>1?'<div class="pks-lv">'+levels.map(l=>'<button type="button" data-lv="'+esc(l)+'" class="'+(l===level?'on':'')+'">'+esc(l)+'</button>').join('')+'</div>':'')
      +'<div class="pks-grid">'+paketCards(level,cat,cur)+'</div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(()=>{el.classList.add('in');const c=el.querySelector('.pks-c.cur');if(c)c.scrollIntoView({block:'center'});});
    el.addEventListener('click',e=>{
      const t=e.target;
      if(t.closest('.pks-bg')||t.closest('.pks-x')){closePaket();return;}
      const lv=t.closest('[data-lv]');
      if(lv){level=lv.dataset.lv;el.querySelectorAll('[data-lv]').forEach(b=>b.classList.toggle('on',b===lv));el.querySelector('.pks-grid').innerHTML=paketCards(level,cat,cur);return;}
      const c=t.closest('.pks-c');if(c)goPaket(c.dataset.id,cat);
    });
  }
  document.addEventListener('click',e=>{
    const t=e.target;if(!t||!t.closest||prog)return;
    const g=t.closest('#examShell .cdk-gear');
    if(g){setOpen(!open);return;}
    const b=t.closest('#examShell .cdk-b');
    if(b){
      poke();const k=b.dataset.k;
      if(k==='pm'&&typeof READMODE!=='undefined')READMODE.toggle();
      else if(k==='pk'){ setOpen(false); requestAnimationFrame(()=>openPaket()); }
      else if(k==='sec'){
        const tb=tabs(),i=tb.findIndex(x=>x.classList.contains('on'));
        if(tb.length){prog=true;tb[(i+1)%tb.length].click();prog=false;}
        [60,300,900].forEach(d=>setTimeout(()=>{mount();poke();},d));
      }else if(k==='grid'){
        const gb=document.querySelector('#examShell .xs-mbar .xs-gridbtn');if(gb){prog=true;gb.click();prog=false;}
        setTimeout(()=>setOpen(false),500);
      }
      setTimeout(sync,40);setTimeout(sync,300);
      return;
    }
    if(open&&!t.closest('.cdk'))setOpen(false);
  });
  document.addEventListener('pointerdown',e=>{if(open&&e.target.closest&&e.target.closest('.cdk'))poke();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('pksSheet'))closePaket();else if(open)setOpen(false);}});
  window.addEventListener('resize',()=>{if(open)document.querySelectorAll('.cdk').forEach(measure);});
  return {mount,sync,open:setOpen,isOpen:()=>open};
})();
