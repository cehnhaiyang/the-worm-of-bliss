
// ============================================
// 姓名系统 (Name System)
// 按国家/文化区域组织，确保姓名匹配
// 格式：东亚文化使用"姓+名"，西方文化使用"名+姓"
// ============================================

import { NameData, NameOrigin } from '../meta';

// ============================================
// 东亚文化 (East Asian) - 姓在前
// ============================================

/** 中国 (Chinese) */
export const CHINESE_NAMES: NameData = {
  format: 'eastern',
  surnames: [
    // 百家姓常见姓氏 (100+)
    '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周',
    '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '高', '罗',
    '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
    '彭', '曾', '萧', '田', '董', '潘', '袁', '蔡', '蒋', '余',
    '于', '杜', '叶', '程', '魏', '苏', '吕', '丁', '任', '沈',
    '姚', '卢', '傅', '钟', '姜', '崔', '谭', '廖', '范', '汪',
    '陆', '金', '石', '戴', '贾', '韦', '夏', '邱', '方', '侯',
    '邹', '熊', '孟', '秦', '白', '江', '阎', '薛', '尹', '段',
    '雷', '黎', '史', '龙', '陶', '贺', '顾', '毛', '郝', '龚',
    '邵', '万', '钱', '严', '覃', '武', '戚', '莫', '孔', '向',
    '常', '汤', '康', '易', '乔', '赖', '文', '施', '洪', '季',
    '祝', '章', '鲁', '葛', '伍', '韦', '申', '尤', '毕', '聂',
    '丛', '焦', '向', '柳', '邢', '路', '岳', '齐', '沿', '梅',
    '庄', '辛', '管', '祁', '欧阳', '司马', '上官', '诸葛', '东方', '慕容',
    '南宫', '西门', '独孤', '令狐', '皇甫', '公孙', '轩辕', '夏侯', '司徒', '尉迟',
  ],
  givenNames: [
    // 常见女性名字 (200+)
    '婉儿', '晓梦', '芷若', '雨桐', '诗涵', '梦璐', '沛玲', '欣怡', '雅静', '韵寒',
    '莉姿', '梦洁', '凌薇', '美莲', '雅琴', '傲蕾', '语嫣', '凌菲', '香怡', '思欣',
    '映真', '雨莉', '语蝶', '彩萱', '紫萱', '雪芳', '宛儿', '妙佳', '曼玉', '雪雁',
    '煜婷', '羽馨', '靖瑶', '瑾萱', '漫妮', '欣妍', '玉珍', '茹雪', '正梅', '美琳',
    '欢馨', '优璇', '雨嘉', '明美', '可馨', '惠茜', '香茹', '月婵', '嫦曦', '静香',
    '梦柏', '醉蓝', '采文', '雪薇', '绮兰', '雅芙', '曼柔', '冷菱', '雪柔', '思蕾',
    '半芹', '雅山', '紫丝', '白桃', '语风', '傲云', '谷蕊', '笑旋', '孤松', '若兰',
    '清雅', '秋水', '冰心', '玉洁', '芳华', '丽娜', '佳琪', '雯雯', '晴晴', '萌萌',
    '甜甜', '乐乐', '悦悦', '欣欣', '婷婷', '莹莹', '盈盈', '晶晶', '菲菲', '蓉蓉',
    '娟娟', '燕燕', '芬芬', '兰兰', '梅梅', '竹青', '松雪', '柏寒', '桂香', '荷香',
    '莲心', '菊影', '桃红', '杏雨', '梨云', '樱雪', '柳絮', '槐香', '榆钱', '枫叶',
    '霜华', '露珠', '云霞', '月华', '星辰', '日暖', '风清', '雨润', '雪融', '冰清',
    '玉润', '珠圆', '翠微', '碧波', '青黛', '紫烟', '红袖', '绿萝', '黄莺', '白鹭',
    '凤仪', '鸾舞', '鹤影', '燕归', '莺啼', '蝶恋', '蜂舞', '萤火', '蛾眉', '蝉鸣',
    '琴韵', '棋心', '书香', '画意', '诗情', '词韵', '曲调', '歌声', '舞姿', '戏梦',
    '锦绣', '绫罗', '绸缎', '丝竹', '弦歌', '笙箫', '琵琶', '古筝', '洞箫', '玉笛',
    '明珠', '宝玉', '翡翠', '玛瑙', '珊瑚', '琥珀', '水晶', '钻石', '黄金', '白银',
    '春晓', '夏荷', '秋月', '冬雪', '晨曦', '暮霭', '朝阳', '夕照', '午后', '子夜',
    '思琪', '雨萱', '梓涵', '子萱', '紫涵', '梓萱', '子涵', '紫萱', '梓琪', '子琪',
    '一诺', '艺涵', '可欣', '诗琪', '梦琪', '雨彤', '欣然', '语桐', '若曦', '沐晴',
  ],
};

/** 日本 (Japanese) */
export const JAPANESE_NAMES: NameData = {
  format: 'eastern',
  surnames: [
    // 常见日本姓氏 (100+)
    '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
    '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水',
    '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川',
    '前田', '岡田', '長谷川', '藤田', '後藤', '近藤', '村上', '遠藤', '青木', '坂本',
    '斉藤', '福田', '太田', '西村', '藤井', '金子', '岡本', '藤原', '三浦', '中野',
    '原田', '松田', '竹内', '中山', '和田', '石田', '上田', '森田', '原', '柴田',
    '酒井', '工藤', '横山', '宮崎', '宮本', '内田', '高木', '安藤', '谷口', '大野',
    '丸山', '今井', '河野', '藤本', '村田', '武田', '上野', '杉山', '増田', '小野',
    '平野', '菅原', '大塚', '千葉', '久保', '松井', '岩崎', '木下', '野口', '松尾',
    '菊地', '野村', '新井', '渡部', '桜井', '佐野', '古川', '市川', '水野', '小松',
    '東', '西', '南', '北', '天野', '星野', '川上', '川下', '川村', '川口',
    '神谷', '神田', '神崎', '神山', '白石', '黒田', '赤井', '青山', '緑川', '紫藤',
  ],
  givenNames: [
    // 常见女性名字 (150+)
    '桜', '結衣', '陽菜', '凛', '結菜', '陽葵', '澪', '紬', '杏', '琴音',
    '詩織', '美咲', '愛', '美月', '花音', '千尋', '彩花', '明莉', '奈々', '桃子',
    'あかり', 'ひまり', 'さくら', '美優', '七海', '明日香', '由美', '涼子', '真由美', '雪乃',
    '静香', '優子', '里奈', '沙織', '恵', '葵', '楓', '日和', '莉子', '芽依',
    '小春', '美桜', '咲良', '心春', '一花', '朱里', '茜', '日向', '千夏', '真白',
    '美希', '千鶴', '和葉', '詩乃', '美羽', '菜々子', '玲奈', '真央', '遥', '優衣',
    '彩', '舞', '翼', '光', '風', '空', '海', '月', '星', '雪',
    '花', '蘭', '菊', '梅', '桃', '椿', '藤', '萩', '菫', '百合',
    '瑠璃', '琉璃', '瑠奈', '琉奈', '瑠美', '琉美', '瑠花', '琉花', '瑠香', '琉香',
    '美琴', '美鈴', '美玲', '美怜', '美麗', '美里', '美紀', '美樹', '美貴', '美姫',
    '香織', '香澄', '香菜', '香奈', '香穂', '香帆', '香苗', '香那', '香波', '香葉',
    '麻衣', '麻美', '麻由', '麻耶', '麻里', '麻紀', '麻奈', '麻菜', '麻帆', '麻穂',
    '沙耶', '沙也', '沙夜', '沙弥', '沙矢', '沙世', '沙代', '沙予', '沙与', '沙余',
    '綾', '綾香', '綾乃', '綾音', '綾子', '綾美', '綾奈', '綾菜', '綾華', '綾花',
    '瞳', '瞳子', '瞳美', '瞳香', '瞳奈', '瞳菜', '瞳華', '瞳花', '瞳音', '瞳乃',
  ],
};

/** 韩国 (Korean) */
export const KOREAN_NAMES: NameData = {
  format: 'eastern',
  surnames: [
    // 常见韩国姓氏 (80+)
    '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
    '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
    '홍', '고', '문', '양', '손', '배', '백', '허', '유', '남',
    '심', '노', '하', '곽', '성', '차', '주', '우', '구', '민',
    '진', '나', '지', '엄', '채', '원', '천', '방', '공', '현',
    '함', '변', '염', '석', '선', '설', '마', '길', '연', '위',
    '표', '명', '기', '반', '라', '왕', '금', '옥', '육', '인',
    '맹', '제', '모', '탁', '국', '여', '어', '은', '편', '용',
  ],
  givenNames: [
    // 常见女性名字 (150+)
    '지수', '민지', '서연', '하은', '지은', '수빈', '예은', '다은', '지우', '소윤',
    '서현', '하윤', '지아', '서윤', '채원', '지윤', '은지', '시은', '민서', '유진',
    '현주', '나영', '혜진', '지현', '수진', '은영', '가은', '연우', '수아', '다인',
    '예린', '소율', '시아', '아린', '하율', '서아', '유나', '주하', '채은', '서하',
    '민주', '예진', '지영', '수민', '지원', '혜원', '소현', '은서', '예원', '채영',
    '보라', '미라', '선희', '영희', '정희', '순희', '옥순', '말순', '복순', '춘자',
    '영자', '순자', '정자', '명자', '경자', '숙자', '미자', '은자', '선자', '혜자',
    '아름', '다솜', '나래', '하늘', '바다', '별', '달', '해', '꽃', '봄',
    '여름', '가을', '겨울', '새벽', '노을', '이슬', '안개', '구름', '바람', '비',
    '소리', '향기', '빛', '그림', '노래', '춤', '꿈', '사랑', '희망', '행복',
    '은비', '은별', '은하', '은솔', '은율', '은채', '은혜', '은정', '은수', '은미',
    '서영', '서진', '서희', '서린', '서율', '서은', '서연', '서현', '서윤', '서아',
    '지혜', '지민', '지연', '지선', '지희', '지인', '지안', '지유', '지율', '지온',
    '수연', '수현', '수정', '수진', '수민', '수아', '수빈', '수린', '수율', '수은',
    '예나', '예지', '예린', '예슬', '예빈', '예원', '예진', '예은', '예서', '예솔',
  ],
};

/** 越南 (Vietnamese) */
export const VIETNAMESE_NAMES: NameData = {
  format: 'eastern',
  surnames: [
    'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trương', 'Cao', 'Lương',
    'Tạ', 'Đoàn', 'Tô', 'Hà', 'Thái', 'Châu', 'Quách', 'Từ', 'Mai', 'Lâm',
    'Tăng', 'Kiều', 'Triệu', 'Chu', 'Vương', 'Đào', 'La', 'Tống', 'Phùng', 'Mạc',
  ],
  givenNames: [
    'Anh', 'Bích', 'Chi', 'Diễm', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Hiền', 'Hoa',
    'Hồng', 'Hương', 'Khánh', 'Lan', 'Liên', 'Linh', 'Loan', 'Mai', 'Minh', 'My',
    'Nga', 'Ngân', 'Ngọc', 'Nhung', 'Phương', 'Quỳnh', 'Thanh', 'Thảo', 'Thu', 'Thủy',
    'Trang', 'Trinh', 'Trúc', 'Tuyết', 'Uyên', 'Vân', 'Vi', 'Xuân', 'Yến', 'Ánh',
    'Bảo', 'Cẩm', 'Châu', 'Đào', 'Hằng', 'Huệ', 'Kim', 'Lệ', 'Ly', 'Mỹ',
    'Như', 'Oanh', 'Phúc', 'Quyên', 'Sen', 'Tâm', 'Thúy', 'Tiên', 'Trâm', 'Vy',
  ],
};

// ============================================
// 英语系 (English-speaking) - 名在前
// ============================================

/** 英国 (British) */
export const ENGLISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts',
    'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson', 'White', 'Watson', 'Jackson', 'Wright',
    'Green', 'Harris', 'Cooper', 'King', 'Lee', 'Martin', 'Clarke', 'James', 'Morgan', 'Hughes',
    'Edwards', 'Hill', 'Moore', 'Clark', 'Harrison', 'Scott', 'Young', 'Morris', 'Hall', 'Ward',
    'Turner', 'Carter', 'Phillips', 'Mitchell', 'Patel', 'Adams', 'Campbell', 'Anderson', 'Allen', 'Cook',
    'Bailey', 'Parker', 'Miller', 'Davis', 'Murphy', 'Price', 'Bell', 'Kelly', 'Bennett', 'Gray',
    'Brooks', 'Russell', 'Collins', 'Graham', 'Stewart', 'Reid', 'Murray', 'Powell', 'Palmer', 'Holmes',
    'Rogers', 'Stevens', 'Walsh', 'Hunter', 'Thomson', 'Matthews', 'Ross', 'Owen', 'Mason', 'Knight',
  ],
  givenNames: [
    'Olivia', 'Amelia', 'Isla', 'Ava', 'Mia', 'Ivy', 'Lily', 'Isabella', 'Rosie', 'Sophia',
    'Grace', 'Emily', 'Poppy', 'Ella', 'Evie', 'Charlotte', 'Freya', 'Florence', 'Willow', 'Phoebe',
    'Sophie', 'Alice', 'Daisy', 'Ruby', 'Sienna', 'Elsie', 'Evelyn', 'Harper', 'Millie', 'Matilda',
    'Maya', 'Maisie', 'Aria', 'Luna', 'Esme', 'Penelope', 'Chloe', 'Layla', 'Scarlett', 'Isabelle',
    'Emilia', 'Violet', 'Thea', 'Imogen', 'Eliza', 'Harriet', 'Molly', 'Bella', 'Lola', 'Erin',
    'Mila', 'Ellie', 'Abigail', 'Georgia', 'Jasmine', 'Nancy', 'Zara', 'Orla', 'Lottie', 'Hallie',
    'Bonnie', 'Aurora', 'Ada', 'Arabella', 'Iris', 'Clara', 'Robyn', 'Anna', 'Gracie', 'Summer',
    'Rose', 'Martha', 'Delilah', 'Maria', 'Margot', 'Lydia', 'Ayla', 'Darcy', 'Sara', 'Zoe',
    'Elizabeth', 'Victoria', 'Catherine', 'Margaret', 'Eleanor', 'Beatrice', 'Cecilia', 'Diana', 'Helena', 'Josephine',
    'Madeleine', 'Penelope', 'Rosalind', 'Theodora', 'Winifred', 'Agatha', 'Cordelia', 'Dorothea', 'Evangeline', 'Felicity',
  ],
};

/** 美国 (American) */
export const AMERICAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
    'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
    'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  ],
  givenNames: [
    'Olivia', 'Emma', 'Charlotte', 'Amelia', 'Sophia', 'Isabella', 'Ava', 'Mia', 'Evelyn', 'Luna',
    'Harper', 'Camila', 'Sofia', 'Scarlett', 'Elizabeth', 'Eleanor', 'Emily', 'Chloe', 'Mila', 'Violet',
    'Penelope', 'Gianna', 'Aria', 'Abigail', 'Ella', 'Avery', 'Hazel', 'Nora', 'Layla', 'Lily',
    'Aurora', 'Nova', 'Ellie', 'Madison', 'Grace', 'Isla', 'Willow', 'Zoe', 'Riley', 'Stella',
    'Cora', 'Emilia', 'Hannah', 'Addison', 'Leah', 'Lucy', 'Eliana', 'Ivy', 'Everly', 'Valentina',
    'Paisley', 'Naomi', 'Savannah', 'Brooklyn', 'Claire', 'Natalie', 'Audrey', 'Genesis', 'Skylar', 'Bella',
    'Aaliyah', 'Madelyn', 'Anna', 'Delilah', 'Serenity', 'Caroline', 'Kennedy', 'Kinsley', 'Allison', 'Maya',
    'Sarah', 'Madeline', 'Adeline', 'Alexa', 'Ariana', 'Elena', 'Gabriella', 'Sadie', 'Alice', 'Hailey',
    'Eva', 'Emery', 'Autumn', 'Quinn', 'Nevaeh', 'Piper', 'Ruby', 'Seraphina', 'Jade', 'Melody',
    'Peyton', 'Lydia', 'Aubrey', 'Arianna', 'Eloise', 'Athena', 'Natalia', 'Raelynn', 'Vivian', 'Kaylee',
  ],
};

/** 爱尔兰 (Irish) */
export const IRISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Murphy', 'Kelly', 'Sullivan', 'Walsh', 'Smith', 'Brien', 'Byrne', 'Ryan', 'Connor', 'Reilly',
    'Doyle', 'McCarthy', 'Gallagher', 'Doherty', 'Kennedy', 'Lynch', 'Murray', 'Quinn', 'Moore', 'McLoughlin',
    'Carroll', 'Connolly', 'Daly', 'Connell', 'Wilson', 'Dunne', 'Brennan', 'Burke', 'Collins', 'Campbell',
    'Clarke', 'Johnston', 'Hughes', 'Farrell', 'Fitzgerald', 'Brown', 'Martin', 'Maguire', 'Nolan', 'Flynn',
    'Thompson', 'Callaghan', 'Donnell', 'Duffy', 'Mahony', 'Boyle', 'Healy', 'Shea', 'White', 'Sweeney',
  ],
  givenNames: [
    'Aoife', 'Saoirse', 'Ciara', 'Niamh', 'Roisin', 'Caoimhe', 'Aisling', 'Orla', 'Siobhan', 'Maeve',
    'Fiona', 'Sinead', 'Grainne', 'Clodagh', 'Erin', 'Aoibhinn', 'Eimear', 'Sorcha', 'Deirdre', 'Brigid',
    'Caitlin', 'Shannon', 'Molly', 'Kathleen', 'Eileen', 'Maureen', 'Colleen', 'Bridget', 'Nora', 'Sheila',
    'Oonagh', 'Ailbhe', 'Blaithin', 'Cliona', 'Dervla', 'Eithne', 'Fionnuala', 'Gormlaith', 'Ide', 'Laoise',
    'Meadhbh', 'Neasa', 'Orlaith', 'Riona', 'Sadhbh', 'Tara', 'Una', 'Aislin', 'Branna', 'Cara',
  ],
};

/** 苏格兰 (Scottish) */
export const SCOTTISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Smith', 'Brown', 'Wilson', 'Campbell', 'Stewart', 'Thomson', 'Robertson', 'Anderson', 'MacDonald', 'Scott',
    'Reid', 'Murray', 'Taylor', 'Clark', 'Ross', 'Watson', 'Morrison', 'Paterson', 'Young', 'Mitchell',
    'Walker', 'Fraser', 'Miller', 'Hamilton', 'Graham', 'Henderson', 'Gray', 'Kerr', 'Craig', 'McKenzie',
    'MacLeod', 'MacKay', 'MacLean', 'MacGregor', 'MacKinnon', 'MacIntosh', 'MacPherson', 'MacNeil', 'MacArthur', 'MacMillan',
    'Douglas', 'Bruce', 'Wallace', 'Gordon', 'Cameron', 'Ferguson', 'Sinclair', 'Duncan', 'Munro', 'Lindsay',
  ],
  givenNames: [
    'Isla', 'Eilidh', 'Skye', 'Iona', 'Freya', 'Maisie', 'Elspeth', 'Morven', 'Ailsa', 'Bonnie',
    'Fiona', 'Morag', 'Kirsty', 'Shona', 'Catriona', 'Rhona', 'Mhairi', 'Aileen', 'Ishbel', 'Senga',
    'Effie', 'Fenella', 'Grizel', 'Jessie', 'Kirsten', 'Lorna', 'Mairead', 'Nessa', 'Oighrig', 'Peigi',
    'Robina', 'Seonag', 'Tearlach', 'Uilleam', 'Vhairi', 'Wilma', 'Yvonne', 'Zena', 'Annabel', 'Blair',
  ],
};

// ============================================
// 罗曼语系 (Romance Languages) - 名在前
// ============================================

/** 法国 (French) */
export const FRENCH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent',
    'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard',
    'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Lefevre', 'Faure', 'Andre',
    'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'Francois', 'Legrand', 'Gauthier', 'Garcia',
    'Perrin', 'Robin', 'Clement', 'Morin', 'Nicolas', 'Henry', 'Roussel', 'Mathieu', 'Gautier', 'Masson',
    'Marchand', 'Duval', 'Denis', 'Dumont', 'Marie', 'Lemaire', 'Noel', 'Meyer', 'Dufour', 'Meunier',
  ],
  givenNames: [
    'Emma', 'Jade', 'Louise', 'Alice', 'Chloe', 'Lina', 'Lea', 'Manon', 'Rose', 'Anna',
    'Mila', 'Julia', 'Camille', 'Lola', 'Ambre', 'Zoe', 'Juliette', 'Nina', 'Lou', 'Charlotte',
    'Lucie', 'Agathe', 'Jeanne', 'Margot', 'Romane', 'Clemence', 'Ines', 'Victoire', 'Adele', 'Mathilde',
    'Gabrielle', 'Elise', 'Anais', 'Oceane', 'Pauline', 'Marine', 'Aurelie', 'Elodie', 'Margaux', 'Helene',
    'Genevieve', 'Madeleine', 'Colette', 'Simone', 'Monique', 'Francoise', 'Sylvie', 'Nathalie', 'Isabelle', 'Valerie',
    'Amelie', 'Celeste', 'Delphine', 'Estelle', 'Fleur', 'Giselle', 'Henriette', 'Josephine', 'Lisette', 'Odette',
  ],
};

/** 西班牙 (Spanish) */
export const SPANISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Torres',
    'Flores', 'Rivera', 'Gomez', 'Diaz', 'Reyes', 'Morales', 'Jimenez', 'Ruiz', 'Alvarez', 'Romero',
    'Alonso', 'Gutierrez', 'Navarro', 'Dominguez', 'Vazquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina',
    'Moreno', 'Suarez', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marin', 'Sanz', 'Iglesias',
    'Medina', 'Garrido', 'Cortes', 'Castillo', 'Santos', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Mendez',
    'Cruz', 'Calvo', 'Gallego', 'Vidal', 'Leon', 'Herrera', 'Marquez', 'Pena', 'Cabrera', 'Fuentes',
  ],
  givenNames: [
    'Lucia', 'Sofia', 'Maria', 'Martina', 'Paula', 'Julia', 'Daniela', 'Valeria', 'Alba', 'Emma',
    'Carla', 'Sara', 'Noa', 'Carmen', 'Claudia', 'Valentina', 'Laia', 'Adriana', 'Irene', 'Elena',
    'Aitana', 'Vega', 'Lola', 'Rocio', 'Marta', 'Alejandra', 'Natalia', 'Ines', 'Blanca', 'Celia',
    'Ana', 'Laura', 'Cristina', 'Isabel', 'Beatriz', 'Patricia', 'Rosa', 'Pilar', 'Teresa', 'Dolores',
    'Esperanza', 'Soledad', 'Mercedes', 'Consuelo', 'Amparo', 'Milagros', 'Rosario', 'Inmaculada', 'Concepcion', 'Asuncion',
    'Paloma', 'Estrella', 'Luna', 'Aurora', 'Luz', 'Nieve', 'Mar', 'Cielo', 'Flor', 'Perla',
  ],
};

/** 意大利 (Italian) */
export const ITALIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
    'Bruno', 'Gallo', 'Conti', 'DeLuca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
    'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone',
    'Longo', 'Gentile', 'Martinelli', 'Vitale', 'Lombardo', 'Serra', 'Coppola', 'DeSantis', 'DAngelo', 'Marchetti',
    'Parisi', 'Villa', 'Conte', 'Ferraro', 'Ferri', 'Fabbri', 'Bianco', 'Marini', 'Grasso', 'Valentini',
    'Messina', 'Sala', 'DeAngelis', 'Gatti', 'Pellegrini', 'Palumbo', 'Sanna', 'Farina', 'Rizzi', 'Monti',
  ],
  givenNames: [
    'Sofia', 'Giulia', 'Aurora', 'Ginevra', 'Alice', 'Emma', 'Giorgia', 'Greta', 'Beatrice', 'Anna',
    'Vittoria', 'Chiara', 'Sara', 'Matilde', 'Nicole', 'Francesca', 'Ludovica', 'Arianna', 'Camilla', 'Martina',
    'Elisa', 'Bianca', 'Elena', 'Alessia', 'Mia', 'Noemi', 'Viola', 'Rebecca', 'Adele', 'Gaia',
    'Valentina', 'Lucia', 'Silvia', 'Federica', 'Ilaria', 'Serena', 'Roberta', 'Paola', 'Monica', 'Simona',
    'Claudia', 'Daniela', 'Cristina', 'Michela', 'Sabrina', 'Veronica', 'Eleonora', 'Alessandra', 'Stefania', 'Barbara',
    'Carlotta', 'Costanza', 'Donatella', 'Elisabetta', 'Fiamma', 'Giovanna', 'Isabella', 'Lorenza', 'Margherita', 'Ornella',
  ],
};

/** 葡萄牙 (Portuguese) */
export const PORTUGUESE_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa',
    'Fernandes', 'Goncalves', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho',
    'Teixeira', 'Moreira', 'Correia', 'Mendes', 'Nunes', 'Soares', 'Vieira', 'Monteiro', 'Cardoso', 'Rocha',
    'Raposo', 'Neves', 'Coelho', 'Cruz', 'Cunha', 'Pires', 'Ramos', 'Reis', 'Simoes', 'Antunes',
    'Matos', 'Fonseca', 'Machado', 'Araujo', 'Barbosa', 'Tavares', 'Lourenco', 'Castro', 'Figueiredo', 'Azevedo',
  ],
  givenNames: [
    'Maria', 'Ana', 'Mariana', 'Beatriz', 'Carolina', 'Ines', 'Leonor', 'Matilde', 'Sofia', 'Francisca',
    'Margarida', 'Madalena', 'Diana', 'Rita', 'Lara', 'Catarina', 'Sara', 'Joana', 'Laura', 'Eva',
    'Clara', 'Bianca', 'Alice', 'Gabriela', 'Mafalda', 'Carlota', 'Constanca', 'Filipa', 'Helena', 'Isabel',
    'Teresa', 'Luisa', 'Paula', 'Carla', 'Sandra', 'Susana', 'Patricia', 'Claudia', 'Fernanda', 'Manuela',
    'Raquel', 'Vera', 'Cristina', 'Daniela', 'Andreia', 'Vanessa', 'Liliana', 'Sonia', 'Celia', 'Fatima',
  ],
};

/** 罗马尼亚 (Romanian) */
export const ROMANIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Popa', 'Popescu', 'Pop', 'Ionescu', 'Dumitru', 'Stan', 'Stoica', 'Gheorghe', 'Rusu', 'Munteanu',
    'Matei', 'Constantin', 'Serban', 'Moldovan', 'Nistor', 'Ciobanu', 'Florea', 'Mihai', 'Radu', 'Dinu',
    'Barbu', 'Lazar', 'Ilie', 'Neagu', 'Toma', 'Sandu', 'Cristea', 'Marin', 'Tudor', 'Vasile',
    'Lungu', 'Georgescu', 'Badea', 'Dragomir', 'Cojocaru', 'Dobre', 'Preda', 'Enache', 'Mocanu', 'Voicu',
  ],
  givenNames: [
    'Maria', 'Elena', 'Ana', 'Ioana', 'Andreea', 'Alexandra', 'Cristina', 'Mihaela', 'Gabriela', 'Daniela',
    'Alina', 'Raluca', 'Simona', 'Adriana', 'Roxana', 'Nicoleta', 'Florina', 'Camelia', 'Denisa', 'Bianca',
    'Diana', 'Laura', 'Irina', 'Monica', 'Oana', 'Ramona', 'Silvia', 'Teodora', 'Valentina', 'Violeta',
    'Anca', 'Carmen', 'Corina', 'Dana', 'Ecaterina', 'Felicia', 'Georgiana', 'Iulia', 'Lavinia', 'Madalina',
  ],
};

// ============================================
// 日耳曼语系 (Germanic Languages) - 名在前
// ============================================

/** 德国 (German) */
export const GERMAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
    'Schafer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schroder', 'Neumann', 'Schwarz', 'Zimmermann',
    'Braun', 'Kruger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier',
    'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Kohler', 'Herrmann', 'Konig', 'Walter', 'Mayer', 'Huber',
    'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Moller', 'Weiss', 'Jung', 'Hahn', 'Schubert',
    'Vogel', 'Friedrich', 'Keller', 'Gunther', 'Frank', 'Berger', 'Winkler', 'Roth', 'Beck', 'Lorenz',
  ],
  givenNames: [
    'Emma', 'Mia', 'Hannah', 'Sofia', 'Emilia', 'Lina', 'Anna', 'Mila', 'Lea', 'Ella',
    'Clara', 'Marie', 'Lena', 'Luisa', 'Amelie', 'Johanna', 'Emily', 'Lara', 'Maja', 'Sophie',
    'Charlotte', 'Nele', 'Frieda', 'Ida', 'Greta', 'Paula', 'Mathilda', 'Helena', 'Pia', 'Elisa',
    'Katharina', 'Elisabeth', 'Margarethe', 'Ursula', 'Ingrid', 'Helga', 'Gertrude', 'Hildegard', 'Brunhilde', 'Sigrid',
    'Heidi', 'Liesel', 'Gisela', 'Renate', 'Monika', 'Sabine', 'Petra', 'Claudia', 'Andrea', 'Stefanie',
    'Annika', 'Birgit', 'Dagmar', 'Elke', 'Franziska', 'Gabriele', 'Hannelore', 'Ilse', 'Jutta', 'Karin',
  ],
};

/** 荷兰 (Dutch) */
export const DUTCH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'DeJong', 'Jansen', 'DeVries', 'VandenBerg', 'VanDijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer',
    'DeBoer', 'Mulder', 'DeGroot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'VanLeeuwen', 'Dekker', 'Brouwer',
    'DeWit', 'Dijkstra', 'Smits', 'DeGraaf', 'VanderMeer', 'VanderLinden', 'Kok', 'Jacobs', 'DeHaan', 'Vermeer',
    'VandenHeuvel', 'VanderVeen', 'VandenBroek', 'DeKoning', 'Schouten', 'VanDam', 'DeRuiter', 'Kuiper', 'Willems', 'Hoekstra',
  ],
  givenNames: [
    'Emma', 'Julia', 'Sophie', 'Anna', 'Lotte', 'Eva', 'Sanne', 'Lisa', 'Fleur', 'Noa',
    'Mila', 'Sara', 'Tessa', 'Isa', 'Lieke', 'Nina', 'Femke', 'Roos', 'Elin', 'Britt',
    'Fenna', 'Lina', 'Noor', 'Yara', 'Zoey', 'Amber', 'Evi', 'Lynn', 'Maud', 'Vera',
    'Danique', 'Esmee', 'Floor', 'Gwen', 'Hanna', 'Iris', 'Jasmijn', 'Kim', 'Lana', 'Merel',
    'Naomi', 'Olivia', 'Pien', 'Quinn', 'Renske', 'Silke', 'Thea', 'Anouk', 'Bente', 'Cato',
  ],
};

/** 瑞典 (Swedish) */
export const SWEDISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson',
    'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Jönsson', 'Lindberg', 'Jakobsson', 'Magnusson', 'Lindström',
    'Lindqvist', 'Lindgren', 'Axelsson', 'Berg', 'Bergström', 'Lundberg', 'Lundgren', 'Lundqvist', 'Mattsson', 'Berglund',
    'Fredriksson', 'Sandberg', 'Henriksson', 'Forsberg', 'Sjöberg', 'Wallin', 'Engström', 'Eklund', 'Danielsson', 'Lundin',
  ],
  givenNames: [
    'Alice', 'Maja', 'Elsa', 'Ella', 'Wilma', 'Alma', 'Olivia', 'Astrid', 'Ebba', 'Saga',
    'Freja', 'Agnes', 'Lilly', 'Vera', 'Selma', 'Stella', 'Klara', 'Nellie', 'Ines', 'Signe',
    'Elvira', 'Alva', 'Emilia', 'Julia', 'Molly', 'Nora', 'Ellie', 'Isabelle', 'Tyra', 'Elin',
    'Ingrid', 'Greta', 'Britta', 'Karin', 'Margareta', 'Kristina', 'Birgitta', 'Gunilla', 'Annika', 'Lena',
    'Linnea', 'Lovisa', 'Matilda', 'Sigrid', 'Tilda', 'Tuva', 'Hedda', 'Ida', 'Liv', 'Ronja',
  ],
};

/** 挪威 (Norwegian) */
export const NORWEGIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen',
    'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen', 'Jacobsen', 'Dahl',
    'Jorgensen', 'Henriksen', 'Lund', 'Halvorsen', 'Sorensen', 'Jakobsen', 'Moen', 'Gundersen', 'Iversen', 'Strand',
    'Solberg', 'Svendsen', 'Eide', 'Knutsen', 'Martinsen', 'Brekke', 'Bakken', 'Kristoffersen', 'Mathisen', 'Lie',
  ],
  givenNames: [
    'Emma', 'Nora', 'Ella', 'Maja', 'Olivia', 'Emilie', 'Sofia', 'Leah', 'Ingrid', 'Sara',
    'Frida', 'Amalie', 'Ada', 'Thea', 'Alma', 'Selma', 'Mia', 'Astrid', 'Hedda', 'Anna',
    'Ida', 'Vilde', 'Aurora', 'Tiril', 'Tuva', 'Oda', 'Mathilde', 'Sigrid', 'Elise', 'Linnea',
    'Solveig', 'Liv', 'Grete', 'Kari', 'Marit', 'Randi', 'Silje', 'Hilde', 'Tone', 'Berit',
  ],
};

/** 丹麦 (Danish) */
export const DANISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sorensen', 'Rasmussen', 'Jorgensen',
    'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen', 'Christiansen', 'Poulsen', 'Johansen', 'Knudsen', 'Mortensen',
    'Moller', 'Jacobsen', 'Jakobsen', 'Olesen', 'Frederiksen', 'Mikkelsen', 'Henriksen', 'Laursen', 'Lund', 'Schmidt',
    'Eriksen', 'Holm', 'Kristiansen', 'Clausen', 'Simonsen', 'Svendsen', 'Andreasen', 'Iversen', 'Jeppesen', 'Nissen',
  ],
  givenNames: [
    'Emma', 'Ida', 'Clara', 'Freja', 'Alma', 'Ella', 'Sofia', 'Anna', 'Karla', 'Josefine',
    'Olivia', 'Alberte', 'Agnes', 'Laura', 'Lærke', 'Isabella', 'Maja', 'Nora', 'Emily', 'Mathilde',
    'Victoria', 'Sofie', 'Luna', 'Lily', 'Astrid', 'Frida', 'Ellen', 'Emilie', 'Mille', 'Sara',
    'Asta', 'Dagny', 'Gerda', 'Helga', 'Inge', 'Karen', 'Kirsten', 'Lise', 'Mette', 'Rikke',
  ],
};

/** 芬兰 (Finnish) */
export const FINNISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Korhonen', 'Virtanen', 'Mäkinen', 'Nieminen', 'Mäkelä', 'Hämäläinen', 'Laine', 'Heikkinen', 'Koskinen', 'Järvinen',
    'Lehtonen', 'Lehtinen', 'Saarinen', 'Salminen', 'Heinonen', 'Niemi', 'Heikkilä', 'Kinnunen', 'Salonen', 'Turunen',
    'Salo', 'Laitinen', 'Tuominen', 'Rantanen', 'Karjalainen', 'Jokinen', 'Mattila', 'Savolainen', 'Lahtinen', 'Ahonen',
    'Ojala', 'Leppänen', 'Kallio', 'Hiltunen', 'Koivisto', 'Pitkänen', 'Aaltonen', 'Kärkkäinen', 'Toivonen', 'Laaksonen',
  ],
  givenNames: [
    'Aino', 'Eevi', 'Emma', 'Sofia', 'Aada', 'Ella', 'Helmi', 'Venla', 'Olivia', 'Lilja',
    'Isla', 'Emilia', 'Enni', 'Pihla', 'Siiri', 'Iida', 'Elsa', 'Anni', 'Hilla', 'Saimi',
    'Ilona', 'Matilda', 'Nea', 'Oona', 'Ronja', 'Sanni', 'Tuuli', 'Veera', 'Viivi', 'Wilma',
    'Aila', 'Eila', 'Hilkka', 'Kaarina', 'Liisa', 'Maija', 'Marja', 'Pirjo', 'Raija', 'Sirkka',
  ],
};

/** 冰岛 (Icelandic) */
export const ICELANDIC_NAMES: NameData = {
  format: 'western',
  surnames: [
    // 冰岛使用父名制，姓氏为"父名+son/dóttir"
    'Jónsdóttir', 'Sigurðardóttir', 'Guðmundsdóttir', 'Gunnarsdóttir', 'Ólafsdóttir', 'Einarsdóttir', 'Kristjánsdóttir', 'Stefánsdóttir', 'Jóhannsdóttir', 'Magnúsdóttir',
    'Þórsdóttir', 'Björnsdóttir', 'Haraldsdóttir', 'Pétursdóttir', 'Ragnarsdóttir', 'Helgadóttir', 'Ingvarsdóttir', 'Karlsdóttir', 'Leifsdóttir', 'Matthíasdóttir',
  ],
  givenNames: [
    'Guðrún', 'Anna', 'Kristín', 'Sigríður', 'Margrét', 'Helga', 'Sigrún', 'Ingibjörg', 'María', 'Jóhanna',
    'Katrín', 'Elísabet', 'Þóra', 'Ragnheiður', 'Guðný', 'Ásta', 'Hildur', 'Ólöf', 'Erla', 'Hrafnhildur',
    'Birna', 'Dagný', 'Edda', 'Fjóla', 'Gerður', 'Halla', 'Inga', 'Jóna', 'Kolbrún', 'Lilja',
    'Nanna', 'Oddný', 'Pála', 'Rakel', 'Sólveig', 'Tinna', 'Unnur', 'Védís', 'Ylfa', 'Þórdís',
  ],
};

// ============================================
// 斯拉夫语系 (Slavic Languages) - 名在前
// ============================================

/** 俄罗斯 (Russian) */
export const RUSSIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Иванова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Петрова', 'Соколова', 'Михайлова', 'Новикова', 'Федорова',
    'Морозова', 'Волкова', 'Алексеева', 'Лебедева', 'Семенова', 'Егорова', 'Павлова', 'Козлова', 'Степанова', 'Николаева',
    'Орлова', 'Андреева', 'Макарова', 'Никитина', 'Захарова', 'Зайцева', 'Соловьева', 'Борисова', 'Яковлева', 'Григорьева',
    'Романова', 'Воробьева', 'Сергеева', 'Кузьмина', 'Фролова', 'Александрова', 'Дмитриева', 'Королева', 'Гусева', 'Киселева',
    'Ильина', 'Максимова', 'Полякова', 'Сорокина', 'Виноградова', 'Ковалева', 'Белова', 'Медведева', 'Антонова', 'Тарасова',
  ],
  givenNames: [
    'Анастасия', 'Мария', 'Анна', 'Виктория', 'Екатерина', 'Дарья', 'София', 'Полина', 'Елизавета', 'Александра',
    'Алиса', 'Ксения', 'Варвара', 'Арина', 'Вероника', 'Валерия', 'Милана', 'Ева', 'Ульяна', 'Кира',
    'Маргарита', 'Диана', 'Алина', 'Таисия', 'Василиса', 'Злата', 'Олеся', 'Яна', 'Ольга', 'Татьяна',
    'Наталья', 'Ирина', 'Светлана', 'Елена', 'Людмила', 'Галина', 'Надежда', 'Любовь', 'Вера', 'Нина',
    'Лариса', 'Тамара', 'Раиса', 'Зоя', 'Лидия', 'Антонина', 'Валентина', 'Клавдия', 'Евгения', 'Юлия',
    'Ангелина', 'Кристина', 'Марина', 'Оксана', 'Регина', 'Снежана', 'Эльвира', 'Инна', 'Жанна', 'Лилия',
  ],
};

/** 乌克兰 (Ukrainian) */
export const UKRAINIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Шевченко', 'Бондаренко', 'Коваленко', 'Бойко', 'Ткаченко', 'Кравченко', 'Олійник', 'Шевчук', 'Поліщук', 'Бондар',
    'Ткачук', 'Мельник', 'Марченко', 'Савченко', 'Руденко', 'Коваль', 'Лисенко', 'Петренко', 'Кравчук', 'Клименко',
    'Павленко', 'Мороз', 'Левченко', 'Гриценко', 'Сидоренко', 'Карпенко', 'Пономаренко', 'Литвиненко', 'Гончаренко', 'Тимошенко',
    'Зайченко', 'Романенко', 'Кузьменко', 'Іваненко', 'Федоренко', 'Степаненко', 'Василенко', 'Назаренко', 'Демченко', 'Юрченко',
  ],
  givenNames: [
    'Анастасія', 'Марія', 'Софія', 'Вікторія', 'Дарина', 'Анна', 'Поліна', 'Катерина', 'Олександра', 'Єлизавета',
    'Аліна', 'Діана', 'Юлія', 'Ольга', 'Тетяна', 'Наталія', 'Ірина', 'Світлана', 'Олена', 'Людмила',
    'Оксана', 'Леся', 'Галина', 'Надія', 'Любов', 'Віра', 'Зоряна', 'Соломія', 'Уляна', 'Ярослава',
    'Богдана', 'Злата', 'Мирослава', 'Роксолана', 'Христина', 'Іванна', 'Орися', 'Соня', 'Тереза', 'Ярина',
  ],
};

/** 波兰 (Polish) */
export const POLISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak',
    'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawłowski',
    'Michalski', 'Nowicki', 'Adamczyk', 'Dudek', 'Zając', 'Wieczorek', 'Jabłoński', 'Król', 'Majewski', 'Olszewski',
    'Jaworski', 'Wróbel', 'Malinowski', 'Pawlak', 'Witkowski', 'Walczak', 'Stępień', 'Górski', 'Rutkowski', 'Michalak',
  ],
  givenNames: [
    'Zuzanna', 'Julia', 'Zofia', 'Hanna', 'Maja', 'Lena', 'Alicja', 'Maria', 'Amelia', 'Oliwia',
    'Aleksandra', 'Natalia', 'Wiktoria', 'Emilia', 'Antonina', 'Laura', 'Pola', 'Liliana', 'Iga', 'Nadia',
    'Anna', 'Katarzyna', 'Magdalena', 'Agnieszka', 'Barbara', 'Ewa', 'Krystyna', 'Małgorzata', 'Elżbieta', 'Teresa',
    'Jadwiga', 'Danuta', 'Halina', 'Irena', 'Joanna', 'Monika', 'Dorota', 'Beata', 'Iwona', 'Renata',
    'Patrycja', 'Karolina', 'Sylwia', 'Justyna', 'Paulina', 'Marta', 'Kinga', 'Dominika', 'Weronika', 'Klaudia',
  ],
};

/** 捷克 (Czech) */
export const CZECH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Nováková', 'Svobodová', 'Novotná', 'Dvořáková', 'Černá', 'Procházková', 'Kučerová', 'Veselá', 'Horáková', 'Němcová',
    'Marková', 'Pokorná', 'Pospíšilová', 'Hájková', 'Jelínková', 'Králová', 'Růžičková', 'Benešová', 'Fialová', 'Sedláčková',
    'Doležalová', 'Zemanová', 'Kolářová', 'Navrátilová', 'Čermáková', 'Vaňková', 'Urbanová', 'Blažková', 'Křížová', 'Kopecká',
  ],
  givenNames: [
    'Eliška', 'Anna', 'Adéla', 'Tereza', 'Sofie', 'Viktorie', 'Natálie', 'Ema', 'Karolína', 'Kristýna',
    'Barbora', 'Lucie', 'Nela', 'Veronika', 'Klára', 'Anežka', 'Sára', 'Magdaléna', 'Amálie', 'Ella',
    'Jana', 'Marie', 'Eva', 'Hana', 'Lenka', 'Petra', 'Martina', 'Kateřina', 'Michaela', 'Markéta',
    'Alena', 'Ivana', 'Jitka', 'Monika', 'Zuzana', 'Dagmar', 'Věra', 'Ludmila', 'Blanka', 'Dana',
  ],
};

/** 匈牙利 (Hungarian) */
export const HUNGARIAN_NAMES: NameData = {
  format: 'eastern', // 匈牙利使用东方式姓名顺序
  surnames: [
    'Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas',
    'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos', 'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete',
    'Szilágyi', 'Török', 'Fehér', 'Balázs', 'Gál', 'Kis', 'Szűcs', 'Kocsis', 'Orsós', 'Pintér',
    'Fodor', 'Szalai', 'Sipos', 'Magyar', 'Lukács', 'Gulyás', 'Biró', 'Király', 'László', 'Katona',
  ],
  givenNames: [
    'Hanna', 'Anna', 'Zoé', 'Luca', 'Emma', 'Zsófia', 'Boglárka', 'Lili', 'Nóra', 'Léna',
    'Mia', 'Lilla', 'Jázmin', 'Fanni', 'Gréta', 'Sára', 'Petra', 'Réka', 'Dorina', 'Vivien',
    'Eszter', 'Katalin', 'Erzsébet', 'Mária', 'Ilona', 'Judit', 'Éva', 'Margit', 'Ágnes', 'Zsuzsanna',
    'Krisztina', 'Andrea', 'Mónika', 'Gabriella', 'Anita', 'Nikolett', 'Viktória', 'Adrienn', 'Tímea', 'Enikő',
  ],
};

/** 塞尔维亚 (Serbian) */
export const SERBIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Јовановић', 'Петровић', 'Николић', 'Марковић', 'Ђорђевић', 'Стојановић', 'Илић', 'Станковић', 'Павловић', 'Миловановић',
    'Живковић', 'Томић', 'Костић', 'Ристић', 'Ковачевић', 'Поповић', 'Милошевић', 'Радовановић', 'Стефановић', 'Димитријевић',
  ],
  givenNames: [
    'Милица', 'Ана', 'Марија', 'Јована', 'Теодора', 'Сара', 'Софија', 'Анђела', 'Тамара', 'Јелена',
    'Невена', 'Ивана', 'Драгана', 'Снежана', 'Биљана', 'Весна', 'Зорица', 'Гордана', 'Љиљана', 'Мирјана',
    'Наташа', 'Сања', 'Маја', 'Катарина', 'Александра', 'Николина', 'Милена', 'Данијела', 'Кристина', 'Андреа',
  ],
};

/** 克罗地亚 (Croatian) */
export const CROATIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić', 'Novak', 'Knežević', 'Kovačić', 'Vuković', 'Matić',
    'Tomić', 'Pavlović', 'Perić', 'Blažević', 'Grgić', 'Filipović', 'Radić', 'Šimić', 'Petrović', 'Božić',
  ],
  givenNames: [
    'Ana', 'Marija', 'Ivana', 'Petra', 'Lucija', 'Sara', 'Mia', 'Lana', 'Ema', 'Maja',
    'Katarina', 'Martina', 'Nikolina', 'Antonija', 'Karla', 'Lea', 'Iva', 'Klara', 'Dora', 'Lara',
    'Jelena', 'Marina', 'Sanja', 'Vesna', 'Dubravka', 'Gordana', 'Snježana', 'Mirjana', 'Ljiljana', 'Branka',
  ],
};

/** 保加利亚 (Bulgarian) */
export const BULGARIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Иванова', 'Георгиева', 'Димитрова', 'Петрова', 'Николова', 'Христова', 'Тодорова', 'Стоянова', 'Ангелова', 'Василева',
    'Атанасова', 'Йорданова', 'Костова', 'Колева', 'Маринова', 'Попова', 'Стефанова', 'Добрева', 'Илиева', 'Кирилова',
  ],
  givenNames: [
    'Мария', 'Ивана', 'Елена', 'Виктория', 'Габриела', 'Никол', 'Александра', 'Симона', 'Десислава', 'Йоана',
    'Петя', 'Силвия', 'Даниела', 'Теодора', 'Антония', 'Ралица', 'Невена', 'Цветелина', 'Пламена', 'Росица',
    'Надежда', 'Красимира', 'Снежана', 'Величка', 'Йорданка', 'Стефка', 'Пенка', 'Донка', 'Цветанка', 'Радка',
  ],
};

// ============================================
// 地中海/中东 (Mediterranean/Middle East) - 名在前
// ============================================

/** 希腊 (Greek) */
export const GREEK_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Παπαδόπουλος', 'Βασιλείου', 'Παππάς', 'Αντωνίου', 'Γεωργίου', 'Νικολάου', 'Δημητρίου', 'Ιωάννου', 'Κωνσταντίνου', 'Χριστοδούλου',
    'Αθανασίου', 'Σταυρόπουλος', 'Παπαγεωργίου', 'Οικονόμου', 'Αλεξίου', 'Καραγιάννης', 'Μακρής', 'Πετρόπουλος', 'Σπυρόπουλος', 'Αγγελόπουλος',
  ],
  givenNames: [
    'Μαρία', 'Ελένη', 'Αικατερίνη', 'Γεωργία', 'Βασιλική', 'Σοφία', 'Αναστασία', 'Ευαγγελία', 'Δήμητρα', 'Παναγιώτα',
    'Κωνσταντίνα', 'Χριστίνα', 'Ιωάννα', 'Νικολέτα', 'Αθηνά', 'Θεοδώρα', 'Ειρήνη', 'Σταυρούλα', 'Ελευθερία', 'Φωτεινή',
    'Αλεξάνδρα', 'Δέσποινα', 'Καλλιόπη', 'Μαργαρίτα', 'Ολυμπία', 'Πηνελόπη', 'Ρόδη', 'Στέλλα', 'Τατιάνα', 'Χαρά',
  ],
};

/** 土耳其 (Turkish) */
export const TURKISH_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
    'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
    'Polat', 'Korkmaz', 'Karaca', 'Erdoğan', 'Güneş', 'Aktaş', 'Yalçın', 'Tekin', 'Aksoy', 'Güler',
  ],
  givenNames: [
    'Zeynep', 'Elif', 'Defne', 'Ecrin', 'Azra', 'Nehir', 'Asya', 'Eylül', 'Mira', 'Hiranur',
    'Ayşe', 'Fatma', 'Emine', 'Hatice', 'Merve', 'Büşra', 'Esra', 'Seda', 'Gizem', 'Gamze',
    'Derya', 'Deniz', 'Melis', 'Cansu', 'Dilara', 'Ebru', 'Fulya', 'Gül', 'Hande', 'İrem',
    'Kübra', 'Leyla', 'Melek', 'Naz', 'Özge', 'Pınar', 'Rabia', 'Selin', 'Tuğba', 'Yasemin',
  ],
};

/** 阿拉伯 (Arabic) */
export const ARABIC_NAMES: NameData = {
  format: 'western',
  surnames: [
    'محمد', 'أحمد', 'علي', 'حسن', 'إبراهيم', 'خالد', 'عبدالله', 'سعيد', 'عمر', 'يوسف',
    'الشريف', 'الحسيني', 'العلوي', 'الهاشمي', 'القرشي', 'الأنصاري', 'المصري', 'السعودي', 'الإماراتي', 'الكويتي',
  ],
  givenNames: [
    'فاطمة', 'عائشة', 'مريم', 'زينب', 'خديجة', 'نور', 'سارة', 'ليلى', 'هدى', 'أمينة',
    'ياسمين', 'سلمى', 'رانيا', 'دانا', 'لينا', 'مايا', 'جنى', 'ريم', 'هناء', 'سمر',
    'أمل', 'إيمان', 'صفاء', 'وفاء', 'نجلاء', 'سناء', 'رجاء', 'دعاء', 'علياء', 'زهراء',
    'لمياء', 'أسماء', 'شيماء', 'نسرين', 'نادية', 'سامية', 'كريمة', 'حليمة', 'رحمة', 'بركة',
  ],
};

/** 波斯/伊朗 (Persian/Iranian) */
export const PERSIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'محمدی', 'حسینی', 'رضایی', 'احمدی', 'کریمی', 'موسوی', 'هاشمی', 'علوی', 'جعفری', 'صادقی',
    'میرزایی', 'اکبری', 'نوری', 'قاسمی', 'طاهری', 'رحیمی', 'مرادی', 'یوسفی', 'خانی', 'امیری',
  ],
  givenNames: [
    'فاطمه', 'زهرا', 'مریم', 'سارا', 'نازنین', 'مهسا', 'نگار', 'پریسا', 'شیرین', 'لیلا',
    'آزاده', 'بهار', 'پرستو', 'ترانه', 'ثریا', 'جمیله', 'دریا', 'رویا', 'زیبا', 'سپیده',
    'شبنم', 'شهرزاد', 'شیدا', 'طناز', 'غزاله', 'فرشته', 'گلناز', 'مهتاب', 'نسترن', 'یاسمن',
  ],
};

/** 希伯来/以色列 (Hebrew/Israeli) */
export const HEBREW_NAMES: NameData = {
  format: 'western',
  surnames: [
    'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אברהם', 'פרידמן', 'שרון', 'גולדברג',
    'רוזנברג', 'שפירא', 'קפלן', 'ברקוביץ', 'גרינברג', 'הורוביץ', 'רבינוביץ', 'שוורץ', 'וייס', 'קליין',
  ],
  givenNames: [
    'נועה', 'תמר', 'שירה', 'מאיה', 'יעל', 'אביגיל', 'עדי', 'ליאור', 'רוני', 'דנה',
    'מיכל', 'רחל', 'שרה', 'לאה', 'רבקה', 'מרים', 'חנה', 'דבורה', 'אסתר', 'רות',
    'אורית', 'גלית', 'הדס', 'ורד', 'זהבה', 'חגית', 'טלי', 'יפה', 'כרמית', 'לילך',
  ],
};

// ============================================
// 南亚/东南亚 (South/Southeast Asia) - 名在前
// ============================================

/** 印度 (Indian) */
export const INDIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Joshi', 'Reddy', 'Rao',
    'Nair', 'Menon', 'Iyer', 'Pillai', 'Mukherjee', 'Banerjee', 'Chatterjee', 'Das', 'Ghosh', 'Sen',
    'Agarwal', 'Jain', 'Mehta', 'Kapoor', 'Malhotra', 'Khanna', 'Chopra', 'Bhatia', 'Arora', 'Sethi',
    'Desai', 'Patil', 'Kulkarni', 'Deshpande', 'Jog', 'Naik', 'Shetty', 'Hegde', 'Kamath', 'Pai',
  ],
  givenNames: [
    'Aadhya', 'Aanya', 'Aaradhya', 'Aditi', 'Aisha', 'Ananya', 'Anjali', 'Anushka', 'Avni', 'Diya',
    'Ishita', 'Kavya', 'Kiara', 'Mira', 'Myra', 'Navya', 'Nisha', 'Pari', 'Priya', 'Riya',
    'Saanvi', 'Sara', 'Shreya', 'Siya', 'Tara', 'Vanya', 'Zara', 'Anika', 'Aria', 'Ira',
    'Lakshmi', 'Saraswati', 'Parvati', 'Durga', 'Kali', 'Radha', 'Sita', 'Ganga', 'Yamuna', 'Kaveri',
    'Deepika', 'Padmini', 'Meera', 'Rukmini', 'Savitri', 'Gayatri', 'Sunita', 'Anita', 'Neeta', 'Geeta',
    'Pooja', 'Neha', 'Swati', 'Jyoti', 'Rekha', 'Shobha', 'Usha', 'Lata', 'Asha', 'Nandini',
  ],
};

/** 泰国 (Thai) */
export const THAI_NAMES: NameData = {
  format: 'western',
  surnames: [
    'สมิท', 'วงศ์', 'ศรี', 'พงษ์', 'สุข', 'ชัย', 'ทอง', 'แก้ว', 'จันทร์', 'เจริญ',
    'ประเสริฐ', 'สิริ', 'พร', 'มงคล', 'รัตน์', 'วัฒน์', 'กุล', 'พันธ์', 'ลักษณ์', 'ภัทร',
  ],
  givenNames: [
    'พิมพ์', 'แพรว', 'ปาน', 'ปิ่น', 'พลอย', 'เพชร', 'มุก', 'หยก', 'ฟ้า', 'ดาว',
    'จันทร์', 'ดวง', 'แก้ว', 'ทอง', 'เงิน', 'นาค', 'มณี', 'รัตน์', 'ศรี', 'สุข',
    'นภา', 'ชนิดา', 'กัญญา', 'สุดา', 'วิภา', 'อรุณ', 'รุ่ง', 'แสง', 'ประภา', 'รัศมี',
    'กมล', 'จิตรา', 'ดารา', 'ธิดา', 'นิภา', 'บุษบา', 'ปทุม', 'พรรณ', 'มาลี', 'ลดา',
  ],
};

/** 印度尼西亚 (Indonesian) */
export const INDONESIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Wijaya', 'Susanto', 'Santoso', 'Setiawan', 'Kusuma', 'Gunawan', 'Halim', 'Tan', 'Lim', 'Ng',
    'Sari', 'Putri', 'Dewi', 'Wati', 'Ningsih', 'Rahayu', 'Handayani', 'Lestari', 'Permata', 'Anggraini',
  ],
  givenNames: [
    'Ayu', 'Bunga', 'Citra', 'Dewi', 'Eka', 'Fitri', 'Gita', 'Hana', 'Indah', 'Jasmine',
    'Kartika', 'Lestari', 'Melati', 'Nadia', 'Oktavia', 'Putri', 'Ratna', 'Sari', 'Tari', 'Utami',
    'Wulan', 'Yanti', 'Zahra', 'Anisa', 'Bella', 'Cantika', 'Dian', 'Erna', 'Farah', 'Gina',
    'Hesti', 'Ika', 'Julia', 'Kirana', 'Laras', 'Maya', 'Nina', 'Ovi', 'Pia', 'Rina',
  ],
};

/** 菲律宾 (Filipino) */
export const FILIPINO_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada',
    'Castillo', 'Rivera', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Gonzales', 'Lopez', 'Perez', 'Hernandez',
    'Dela Cruz', 'Delos Santos', 'Delos Reyes', 'Del Rosario', 'San Juan', 'San Pedro', 'Santiago', 'Soriano', 'Tan', 'Lim',
  ],
  givenNames: [
    'Maria', 'Ana', 'Angela', 'Patricia', 'Jennifer', 'Elizabeth', 'Michelle', 'Stephanie', 'Nicole', 'Jessica',
    'Jasmine', 'Angelica', 'Kristine', 'Christine', 'Katherine', 'Samantha', 'Vanessa', 'Bianca', 'Camille', 'Denise',
    'Fatima', 'Grace', 'Hannah', 'Isabel', 'Joanna', 'Karen', 'Liza', 'Maricel', 'Nathalie', 'Olivia',
    'Princess', 'Queen', 'Rose', 'Sarah', 'Theresa', 'Veronica', 'Wendy', 'Yvonne', 'Zenaida', 'Alma',
  ],
};

// ============================================
// 拉丁美洲 (Latin America) - 名在前
// ============================================

/** 巴西 (Brazilian) */
export const BRAZILIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
    'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
    'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas',
    'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira', 'Moura', 'Correia', 'Araújo', 'Melo', 'Barros',
  ],
  givenNames: [
    'Maria', 'Ana', 'Juliana', 'Fernanda', 'Adriana', 'Patricia', 'Camila', 'Amanda', 'Bruna', 'Leticia',
    'Larissa', 'Gabriela', 'Beatriz', 'Carolina', 'Mariana', 'Rafaela', 'Isabela', 'Natalia', 'Vanessa', 'Tatiana',
    'Aline', 'Bianca', 'Carla', 'Daniela', 'Eduarda', 'Fabiana', 'Giovanna', 'Helena', 'Ingrid', 'Jessica',
    'Karina', 'Luana', 'Monique', 'Nicole', 'Priscila', 'Renata', 'Sabrina', 'Thais', 'Viviane', 'Yasmin',
  ],
};

/** 墨西哥 (Mexican) */
export const MEXICAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Hernández', 'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz',
    'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Torres', 'Gutiérrez', 'Ruiz', 'Díaz', 'Moreno',
    'Álvarez', 'Romero', 'Juárez', 'Ramos', 'Mendoza', 'Herrera', 'Medina', 'Aguilar', 'Vargas', 'Castillo',
    'Jiménez', 'Ortiz', 'Chávez', 'Salazar', 'Contreras', 'Rivera', 'Guerrero', 'Delgado', 'Castro', 'Ortega',
  ],
  givenNames: [
    'María', 'Guadalupe', 'Margarita', 'Verónica', 'Elizabeth', 'Alejandra', 'Patricia', 'Rosa', 'Leticia', 'Martha',
    'Adriana', 'Claudia', 'Gabriela', 'Silvia', 'Teresa', 'Gloria', 'Laura', 'Alicia', 'Sandra', 'Yolanda',
    'Sofía', 'Valentina', 'Regina', 'Camila', 'Ximena', 'Renata', 'Isabella', 'Natalia', 'Victoria', 'Daniela',
    'Fernanda', 'Paulina', 'Mariana', 'Andrea', 'Valeria', 'Lucía', 'Ana', 'Jimena', 'Karla', 'Paola',
  ],
};

/** 阿根廷 (Argentinian) */
export const ARGENTINIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'García', 'Sánchez',
    'Romero', 'Sosa', 'Torres', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina',
    'Suárez', 'Herrera', 'Aguirre', 'Pereyra', 'Gutiérrez', 'Giménez', 'Molina', 'Silva', 'Castro', 'Rojas',
  ],
  givenNames: [
    'María', 'Ana', 'Laura', 'Lucía', 'Paula', 'Valentina', 'Camila', 'Martina', 'Sofía', 'Victoria',
    'Florencia', 'Agustina', 'Julieta', 'Micaela', 'Rocío', 'Milagros', 'Abril', 'Candela', 'Pilar', 'Sol',
    'Catalina', 'Emilia', 'Delfina', 'Josefina', 'Olivia', 'Emma', 'Mía', 'Isabella', 'Renata', 'Alma',
    'Celeste', 'Luz', 'Clara', 'Elena', 'Bianca', 'Antonella', 'Lola', 'Nina', 'Zoe', 'Mora',
  ],
};

// ============================================
// 非洲 (Africa) - 名在前
// ============================================

/** 尼日利亚 (Nigerian) */
export const NIGERIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Okonkwo', 'Adeyemi', 'Okafor', 'Eze', 'Nwosu', 'Abubakar', 'Ibrahim', 'Mohammed', 'Bello', 'Yusuf',
    'Obi', 'Chukwu', 'Onyeka', 'Emeka', 'Nnamdi', 'Adebayo', 'Oluwaseun', 'Adeola', 'Olumide', 'Babatunde',
    'Okoro', 'Igwe', 'Uzoma', 'Chibueze', 'Obinna', 'Chinedu', 'Ikenna', 'Kelechi', 'Uchenna', 'Azubuike',
  ],
  givenNames: [
    'Adaeze', 'Amara', 'Chiamaka', 'Chidinma', 'Chinyere', 'Ebele', 'Ifeoma', 'Ngozi', 'Nkechi', 'Obiageli',
    'Oluchi', 'Onyinye', 'Uchenna', 'Adanna', 'Amarachi', 'Chidimma', 'Chisom', 'Ezinne', 'Ifunanya', 'Nneoma',
    'Aisha', 'Amina', 'Fatima', 'Halima', 'Hauwa', 'Khadija', 'Maryam', 'Nafisa', 'Rahma', 'Zainab',
    'Blessing', 'Favour', 'Gift', 'Grace', 'Joy', 'Love', 'Mercy', 'Peace', 'Precious', 'Victory',
  ],
};

/** 埃塞俄比亚 (Ethiopian) */
export const ETHIOPIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Haile', 'Gebre', 'Tadesse', 'Bekele', 'Tesfaye', 'Abebe', 'Kebede', 'Girma', 'Desta', 'Mekonnen',
    'Assefa', 'Wolde', 'Negash', 'Yohannes', 'Tekle', 'Berhe', 'Hagos', 'Gebru', 'Amare', 'Mulugeta',
  ],
  givenNames: [
    'Abeba', 'Almaz', 'Aster', 'Bethlehem', 'Birtukan', 'Eden', 'Eleni', 'Frehiwot', 'Genet', 'Hanna',
    'Hirut', 'Kidist', 'Liya', 'Mahlet', 'Meron', 'Meseret', 'Rahel', 'Sara', 'Seble', 'Selam',
    'Senait', 'Tigist', 'Tsehay', 'Wubit', 'Yeshi', 'Zewditu', 'Aida', 'Bilen', 'Dina', 'Fana',
  ],
};

/** 埃及 (Egyptian) */
export const EGYPTIAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'محمد', 'أحمد', 'علي', 'حسن', 'إبراهيم', 'عبدالله', 'السيد', 'مصطفى', 'عبدالرحمن', 'يوسف',
    'الشريف', 'المصري', 'الفقي', 'البدوي', 'الجندي', 'الحكيم', 'الرفاعي', 'السعيد', 'الشافعي', 'الطيب',
  ],
  givenNames: [
    'فاطمة', 'نور', 'سارة', 'مريم', 'ياسمين', 'هدى', 'أمل', 'إيمان', 'سلمى', 'رانيا',
    'دينا', 'منى', 'هبة', 'نهى', 'شيماء', 'أسماء', 'علياء', 'نسرين', 'سمر', 'داليا',
    'مها', 'ريم', 'جنى', 'لينا', 'مايا', 'ندى', 'روان', 'تسنيم', 'ملك', 'حبيبة',
  ],
};

/** 南非 (South African) */
export const SOUTHAFRICAN_NAMES: NameData = {
  format: 'western',
  surnames: [
    'Nkosi', 'Dlamini', 'Ndlovu', 'Zulu', 'Khumalo', 'Mthembu', 'Ngcobo', 'Sithole', 'Mkhize', 'Naidoo',
    'Pillay', 'Govender', 'Reddy', 'Maharaj', 'Singh', 'Van der Merwe', 'Botha', 'Du Plessis', 'Pretorius', 'Van Wyk',
    'Jacobs', 'Williams', 'Abrahams', 'Davids', 'Petersen', 'Adams', 'Hendricks', 'Isaacs', 'Jansen', 'Paulse',
  ],
  givenNames: [
    'Nomvula', 'Thandi', 'Lindiwe', 'Nokuthula', 'Zanele', 'Sibongile', 'Nompumelelo', 'Ayanda', 'Nonhlanhla', 'Busisiwe',
    'Priya', 'Kavitha', 'Anisha', 'Reshma', 'Sunita', 'Nalini', 'Kamini', 'Shanti', 'Lakshmi', 'Devi',
    'Annemarie', 'Charlize', 'Elzabe', 'Hannelie', 'Ilse', 'Jeanette', 'Karlien', 'Liezel', 'Marelize', 'Nicolene',
    'Chantelle', 'Monique', 'Natasha', 'Samantha', 'Tanya', 'Vanessa', 'Wendy', 'Yolande', 'Zandile', 'Precious',
  ],
};

// ============================================
// 神话/幻想 (Mythical/Fantasy) - 名在前
// ============================================

/** 神话名字 (Mythical) */
export const MYTHICAL_NAMES: NameData = {
  format: 'western',
  surnames: [
    // 希腊神话
    'Olympia', 'Elysium', 'Tartarus', 'Erebus', 'Aether',
    // 北欧神话
    'Asgard', 'Valhalla', 'Midgard', 'Niflheim', 'Muspelheim',
    // 凯尔特神话
    'Avalon', 'Tir na nOg', 'Annwn', 'Mag Mell', 'Emain Ablach',
    // 抽象/宇宙
    'Void', 'Abyss', 'Cosmos', 'Nexus', 'Ethereal',
    'Celestial', 'Astral', 'Phantom', 'Shadow', 'Eclipse',
    'Twilight', 'Dawn', 'Dusk', 'Midnight', 'Solstice',
  ],
  givenNames: [
    // 希腊女神/人物
    'Athena', 'Artemis', 'Aphrodite', 'Persephone', 'Selene', 'Eos', 'Nyx', 'Hera', 'Demeter', 'Hestia',
    'Psyche', 'Echo', 'Daphne', 'Calypso', 'Circe', 'Medusa', 'Pandora', 'Cassandra', 'Ariadne', 'Helen',
    'Electra', 'Iphigenia', 'Antigone', 'Andromeda', 'Eurydice', 'Penelope', 'Clytemnestra', 'Hecate', 'Iris', 'Thalia',
    // 北欧女神/人物
    'Freya', 'Frigg', 'Sif', 'Idun', 'Skadi', 'Hel', 'Sigyn', 'Nanna', 'Eir', 'Var',
    'Brunhilde', 'Gudrun', 'Kriemhild', 'Svanhild', 'Aslaug', 'Lagertha', 'Thyra', 'Sigrid', 'Astrid', 'Ingrid',
    // 美索不达米亚/埃及
    'Ishtar', 'Tiamat', 'Inanna', 'Ereshkigal', 'Bastet', 'Isis', 'Sekhmet', 'Hathor', 'Maat', 'Nut',
    'Nephthys', 'Seshat', 'Wadjet', 'Neith', 'Mut', 'Tefnut', 'Satet', 'Anuket', 'Heqet', 'Taweret',
    // 凯尔特
    'Morrigan', 'Brigid', 'Danu', 'Epona', 'Rhiannon', 'Cerridwen', 'Arianrhod', 'Blodeuwedd', 'Branwen', 'Aine',
    // 日本神话
    'Amaterasu', 'Tsukuyomi', 'Izanami', 'Benzaiten', 'Inari', 'Kaguya', 'Tamamo', 'Yuki', 'Kitsune', 'Tengu',
    // 印度神话
    'Lakshmi', 'Saraswati', 'Parvati', 'Durga', 'Kali', 'Radha', 'Sita', 'Shakti', 'Ganga', 'Yamuna',
  ],
};

/** 所有名字数据集合 */
export const ALL_NAME_DATASETS: { origin: NameOrigin; data: NameData }[] = [
  { origin: 'chinese', data: CHINESE_NAMES },
  { origin: 'japanese', data: JAPANESE_NAMES },
  { origin: 'korean', data: KOREAN_NAMES },
  { origin: 'vietnamese', data: VIETNAMESE_NAMES },
  { origin: 'english', data: ENGLISH_NAMES },
  { origin: 'american', data: AMERICAN_NAMES },
  { origin: 'irish', data: IRISH_NAMES },
  { origin: 'scottish', data: SCOTTISH_NAMES },
  { origin: 'french', data: FRENCH_NAMES },
  { origin: 'spanish', data: SPANISH_NAMES },
  { origin: 'italian', data: ITALIAN_NAMES },
  { origin: 'portuguese', data: PORTUGUESE_NAMES },
  { origin: 'romanian', data: ROMANIAN_NAMES },
  { origin: 'german', data: GERMAN_NAMES },
  { origin: 'dutch', data: DUTCH_NAMES },
  { origin: 'swedish', data: SWEDISH_NAMES },
  { origin: 'norwegian', data: NORWEGIAN_NAMES },
  { origin: 'danish', data: DANISH_NAMES },
  { origin: 'finnish', data: FINNISH_NAMES },
  { origin: 'icelandic', data: ICELANDIC_NAMES },
  { origin: 'russian', data: RUSSIAN_NAMES },
  { origin: 'ukrainian', data: UKRAINIAN_NAMES },
  { origin: 'polish', data: POLISH_NAMES },
  { origin: 'czech', data: CZECH_NAMES },
  { origin: 'hungarian', data: HUNGARIAN_NAMES },
  { origin: 'serbian', data: SERBIAN_NAMES },
  { origin: 'croatian', data: CROATIAN_NAMES },
  { origin: 'bulgarian', data: BULGARIAN_NAMES },
  { origin: 'greek', data: GREEK_NAMES },
  { origin: 'turkish', data: TURKISH_NAMES },
  { origin: 'arabic', data: ARABIC_NAMES },
  { origin: 'persian', data: PERSIAN_NAMES },
  { origin: 'hebrew', data: HEBREW_NAMES },
  { origin: 'indian', data: INDIAN_NAMES },
  { origin: 'thai', data: THAI_NAMES },
  { origin: 'indonesian', data: INDONESIAN_NAMES },
  { origin: 'filipino', data: FILIPINO_NAMES },
  { origin: 'brazilian', data: BRAZILIAN_NAMES },
  { origin: 'mexican', data: MEXICAN_NAMES },
  { origin: 'argentinian', data: ARGENTINIAN_NAMES },
  { origin: 'nigerian', data: NIGERIAN_NAMES },
  { origin: 'ethiopian', data: ETHIOPIAN_NAMES },
  { origin: 'egyptian', data: EGYPTIAN_NAMES },
  { origin: 'southafrican', data: SOUTHAFRICAN_NAMES },
  { origin: 'mythical', data: MYTHICAL_NAMES },
];