// ===== lesson-data.js =====
// Dữ liệu mẫu cho trang Học từ mới khi chưa nối backend (DEMO_MODE = true).
// Khi có backend, API /api/learn/levels chỉ cần trả về đúng cấu trúc này:
// [{ code, name, desc, topics: [{ id, icon, color, name, tag,
//      lessons: [{ id, no, title, words: [{ en, vi, pos, ipa, note, ex, exVi }] }] }] }]
//
//   en, vi        : bắt buộc (từ + nghĩa)
//   pos           : loại từ: noun | verb | adj | adv | phrase
//   ipa           : phiên âm, vd "/ˈfɑː.ðər/"
//   note          : giải thích ngắn bằng tiếng Việt (không bắt buộc)
//   ex, exVi      : câu ví dụ tiếng Anh + bản dịch
// Từ nào thiếu pos/ipa/ex thì trang học tự ẩn phần đó.
//
// Viết gọn: mỗi bài là "từ=nghĩa|từ=nghĩa|..." (8 từ / bài),
// thông tin chi tiết của từ đặt trong WORD_DETAILS bên dưới.

// [loại từ, phiên âm, câu ví dụ, dịch câu ví dụ, ghi chú (tuỳ chọn)]
const WORD_DETAILS = {
  // Family · Bài 1
  father:   ["noun", "/ˈfɑː.ðər/", "My father works in a bank.", "Bố tôi làm việc ở ngân hàng.", "Người đàn ông là cha của bạn."],
  mother:   ["noun", "/ˈmʌð.ər/", "My mother cooks dinner every evening.", "Mẹ tôi nấu bữa tối mỗi tối.", "Người phụ nữ là mẹ của bạn."],
  sister:   ["noun", "/ˈsɪs.tər/", "My sister is two years older than me.", "Chị tôi lớn hơn tôi hai tuổi.", "Dùng cho cả chị gái và em gái."],
  brother:  ["noun", "/ˈbrʌð.ər/", "I play football with my brother.", "Tôi chơi bóng đá với anh trai.", "Dùng cho cả anh trai và em trai."],
  son:      ["noun", "/sʌn/", "Their son is five years old.", "Con trai của họ năm tuổi."],
  daughter: ["noun", "/ˈdɔː.tər/", "She has one daughter.", "Cô ấy có một cô con gái."],
  baby:     ["noun", "/ˈbeɪ.bi/", "The baby is sleeping.", "Em bé đang ngủ."],
  family:   ["noun", "/ˈfæm.əl.i/", "I have a big family.", "Tôi có một gia đình lớn."],
  // Family · Bài 2
  parent:   ["noun", "/ˈpeə.rənt/", "Every parent wants the best for their child.", "Cha mẹ nào cũng muốn điều tốt nhất cho con.", "Chỉ bố hoặc mẹ; số nhiều parents = bố mẹ."],
  child:    ["noun", "/tʃaɪld/", "The child is drawing a picture.", "Đứa trẻ đang vẽ tranh.", "Số nhiều bất quy tắc: children."],
  grandpa:  ["noun", "/ˈɡræn.pɑː/", "My grandpa tells funny stories.", "Ông tôi kể những câu chuyện vui."],
  grandma:  ["noun", "/ˈɡræn.mɑː/", "Grandma makes the best cake.", "Bà làm bánh ngon nhất."],
  uncle:    ["noun", "/ˈʌŋ.kəl/", "My uncle lives in Da Nang.", "Chú tôi sống ở Đà Nẵng."],
  aunt:     ["noun", "/ɑːnt/", "My aunt is a teacher.", "Dì tôi là giáo viên."],
  cousin:   ["noun", "/ˈkʌz.ən/", "My cousin is visiting us this weekend.", "Anh họ tôi đến thăm nhà tôi cuối tuần này."],
  wife:     ["noun", "/waɪf/", "His wife is very kind.", "Vợ anh ấy rất tốt bụng."],
  // Family · Bài 3
  wake:     ["verb", "/weɪk/", "I wake up at six every morning.", "Tôi thức dậy lúc sáu giờ mỗi sáng.", "Thường đi với up: wake up."],
  sleep:    ["verb", "/sliːp/", "Children need to sleep early.", "Trẻ em cần đi ngủ sớm."],
  eat:      ["verb", "/iːt/", "We eat dinner together.", "Chúng tôi ăn tối cùng nhau."],
  play:     ["verb", "/pleɪ/", "The kids play in the garden.", "Bọn trẻ chơi trong vườn."],
  cook:     ["verb", "/kʊk/", "My dad likes to cook on Sundays.", "Bố tôi thích nấu ăn vào Chủ nhật."],
  wash:     ["verb", "/wɒʃ/", "Please wash your hands before eating.", "Hãy rửa tay trước khi ăn."],
  clean:    ["verb", "/kliːn/", "We clean the house every weekend.", "Chúng tôi dọn nhà mỗi cuối tuần."],
  watch:    ["verb", "/wɒtʃ/", "We watch TV after dinner.", "Chúng tôi xem TV sau bữa tối."],
  // Family · Bài 4
  birthday: ["noun", "/ˈbɜːθ.deɪ/", "Today is my mother's birthday.", "Hôm nay là sinh nhật mẹ tôi."],
  party:    ["noun", "/ˈpɑː.ti/", "We are having a party tonight.", "Tối nay chúng tôi tổ chức một bữa tiệc."],
  gift:     ["noun", "/ɡɪft/", "Thank you for the lovely gift.", "Cảm ơn bạn vì món quà dễ thương."],
  candle:   ["noun", "/ˈkæn.dəl/", "Blow out the candles!", "Thổi nến đi nào!"],
  cake:     ["noun", "/keɪk/", "Grandma made a chocolate cake.", "Bà làm một chiếc bánh sô-cô-la."],
  celebrate:["verb", "/ˈsel.ə.breɪt/", "We celebrate Tet with our family.", "Chúng tôi đón Tết cùng gia đình."],
  wish:     ["noun", "/wɪʃ/", "Best wishes for the new year!", "Gửi lời chúc tốt đẹp nhất cho năm mới!"],
  dinner:   ["noun", "/ˈdɪn.ər/", "Dinner is ready!", "Bữa tối xong rồi!"],
  // Family · Bài 5
  love:     ["verb", "/lʌv/", "I love my family.", "Tôi yêu gia đình mình."],
  hug:      ["verb", "/hʌɡ/", "She hugs her mother every morning.", "Cô ấy ôm mẹ mỗi sáng."],
  miss:     ["verb", "/mɪs/", "I miss my grandparents.", "Tôi nhớ ông bà."],
  care:     ["verb", "/keər/", "My parents care about me a lot.", "Bố mẹ rất quan tâm đến tôi.", "Thường đi với about: care about."],
  happy:    ["adj", "/ˈhæp.i/", "We are happy to be together.", "Chúng tôi vui vì được ở bên nhau."],
  proud:    ["adj", "/praʊd/", "My parents are proud of me.", "Bố mẹ tự hào về tôi.", "Thường đi với of: proud of."],
  kind:     ["adj", "/kaɪnd/", "Your sister is very kind.", "Chị bạn rất tử tế."],
  together: ["adv", "/təˈɡeð.ər/", "Let's have lunch together.", "Cùng ăn trưa nhé."]
};

function L(title, words) {
  return {
    title,
    words: words.split("|").map((pair) => {
      const [en, vi] = pair.split("=").map((x) => x.trim());
      const d = WORD_DETAILS[en];
      return d ? { en, vi, pos: d[0], ipa: d[1], ex: d[2], exVi: d[3], note: d[4] || "" } : { en, vi };
    })
  };
}

function T(id, icon, color, name, tag, lessons) {
  return {
    id, icon, color, name, tag,
    lessons: lessons.map((l, i) => ({ ...l, id: `${id}-${i + 1}`, no: i + 1 }))
  };
}

const VOCAB_LEVELS = [
  // ---------------------------------------------------------------- A1
  {
    code: "A1", name: "Sơ cấp", desc: "Dành cho người mới bắt đầu",
    topics: [
      T("a1-family", "🏠", "#fdf1e6", "Family", "Gia đình", [
        L("Members of the Family", "father=bố|mother=mẹ|sister=chị/em gái|brother=anh/em trai|son=con trai|daughter=con gái|baby=em bé|family=gia đình"),
        L("Family Roles", "parent=bố hoặc mẹ|child=đứa con|grandpa=ông|grandma=bà|uncle=chú/bác/cậu|aunt=cô/dì|cousin=anh chị em họ|wife=vợ"),
        L("Daily Family Routines", "wake=thức dậy|sleep=ngủ|eat=ăn|play=chơi|cook=nấu ăn|wash=rửa, giặt|clean=dọn dẹp|watch=xem"),
        L("Family Celebrations", "birthday=sinh nhật|party=bữa tiệc|gift=món quà|candle=cây nến|cake=bánh kem|celebrate=ăn mừng|wish=lời chúc|dinner=bữa tối"),
        L("Family Feelings", "love=yêu thương|hug=ôm|miss=nhớ|care=quan tâm|happy=vui vẻ|proud=tự hào|kind=tử tế|together=cùng nhau")
      ]),
      T("a1-school", "🏫", "#fdf6e3", "School", "Trường học", [
        L("In the Classroom", "teacher=giáo viên|student=học sinh|desk=bàn học|chair=ghế|board=bảng|book=quyển sách|pen=bút mực|pencil=bút chì"),
        L("School Subjects", "math=môn toán|science=khoa học|history=lịch sử|art=mỹ thuật|music=âm nhạc|English=tiếng Anh|geography=địa lý|sport=thể thao"),
        L("School Places", "library=thư viện|classroom=lớp học|canteen=căn tin|playground=sân chơi|office=văn phòng|gate=cổng|hall=hội trường|lab=phòng thí nghiệm"),
        L("Homework & Exams", "homework=bài tập về nhà|exam=bài thi|test=bài kiểm tra|answer=câu trả lời|question=câu hỏi|score=điểm số|pass=vượt qua|study=học"),
        L("A School Day", "bell=chuông|break=giờ ra chơi|lesson=bài học|lunch=bữa trưa|uniform=đồng phục|bag=cặp sách|bus=xe buýt|late=muộn")
      ]),
      T("a1-social", "📱", "#eef4fd", "Social Media", "Mạng xã hội", [
        L("Getting Online", "phone=điện thoại|app=ứng dụng|internet=mạng internet|account=tài khoản|password=mật khẩu|login=đăng nhập|profile=trang cá nhân|online=trực tuyến"),
        L("Posting", "post=bài đăng|photo=bức ảnh|video=đoạn phim|caption=chú thích|share=chia sẻ|upload=tải lên|story=tin ngắn|tag=gắn thẻ"),
        L("Reactions", "like=thích|comment=bình luận|reply=trả lời|follow=theo dõi|emoji=biểu tượng cảm xúc|message=tin nhắn|chat=trò chuyện|block=chặn"),
        L("Being Safe Online", "private=riêng tư|public=công khai|safe=an toàn|fake=giả mạo|report=báo cáo|delete=xóa|link=đường dẫn|warning=cảnh báo"),
        L("Trends", "trend=xu hướng|viral=lan truyền mạnh|famous=nổi tiếng|fan=người hâm mộ|channel=kênh|news=tin tức|view=lượt xem|popular=phổ biến")
      ]),
      T("a1-friends", "👫", "#f1ecfd", "Friends", "Bạn bè", [
        L("Making Friends", "friend=bạn|meet=gặp gỡ|name=tên|smile=mỉm cười|hello=xin chào|introduce=giới thiệu|nice=dễ chịu|classmate=bạn cùng lớp"),
        L("Describing Friends", "tall=cao|short=thấp|funny=hài hước|friendly=thân thiện|smart=thông minh|shy=nhút nhát|quiet=ít nói|honest=trung thực"),
        L("Hanging Out", "cinema=rạp chiếu phim|park=công viên|coffee=cà phê|game=trò chơi|walk=đi dạo|visit=ghé thăm|weekend=cuối tuần|fun=niềm vui"),
        L("Helping Each Other", "help=giúp đỡ|borrow=mượn|lend=cho mượn|support=ủng hộ|advice=lời khuyên|promise=lời hứa|sorry=xin lỗi|thank=cảm ơn"),
        L("Friendship", "best friend=bạn thân|team=đội nhóm|secret=bí mật|memory=kỷ niệm|laugh=cười lớn|argue=cãi nhau|forgive=tha thứ|loyal=trung thành")
      ]),
      T("a1-daily", "☀️", "#e8f6ee", "Daily Life", "Đời sống hằng ngày", [
        L("Morning Routine", "brush=chải, đánh (răng)|shower=tắm vòi sen|dress=mặc quần áo|breakfast=bữa sáng|towel=khăn tắm|mirror=gương|alarm=báo thức|comb=cái lược"),
        L("At Home", "kitchen=nhà bếp|bedroom=phòng ngủ|bathroom=phòng tắm|door=cửa ra vào|window=cửa sổ|table=cái bàn|sofa=ghế sô-pha|lamp=đèn bàn"),
        L("Food & Drinks", "rice=cơm, gạo|bread=bánh mì|water=nước|milk=sữa|egg=trứng|fruit=trái cây|tea=trà|soup=món canh"),
        L("Shopping", "shop=cửa hàng|buy=mua|sell=bán|price=giá cả|cheap=rẻ|expensive=đắt|money=tiền|market=chợ"),
        L("Time & Weather", "morning=buổi sáng|evening=buổi tối|today=hôm nay|tomorrow=ngày mai|sunny=nắng|rain=mưa|hot=nóng|cold=lạnh")
      ])
    ]
  },

  // ---------------------------------------------------------------- A2
  {
    code: "A2", name: "Sơ cấp", desc: "Dùng được trong tình huống hằng ngày",
    topics: [
      T("a2-travel", "✈️", "#e8f1fd", "Travel", "Du lịch", [
        L("At the Airport", "airport=sân bay|ticket=vé|passport=hộ chiếu|luggage=hành lý|flight=chuyến bay|boarding=lên máy bay|delay=sự trì hoãn|departure=khởi hành"),
        L("Hotel Stay", "hotel=khách sạn|reception=quầy lễ tân|room=phòng|key=chìa khóa|reservation=sự đặt chỗ|check in=nhận phòng|check out=trả phòng|guest=khách"),
        L("Asking for Directions", "map=bản đồ|street=đường phố|corner=góc đường|straight=thẳng|left=bên trái|right=bên phải|near=gần|far=xa")
      ]),
      T("a2-health", "🩺", "#fdecec", "Health", "Sức khỏe", [
        L("The Body", "head=đầu|hand=bàn tay|leg=chân|eye=mắt|ear=tai|mouth=miệng|nose=mũi|back=lưng"),
        L("Feeling Ill", "sick=ốm|fever=sốt|cough=ho|headache=đau đầu|tired=mệt mỏi|pain=cơn đau|rest=nghỉ ngơi|medicine=thuốc"),
        L("Healthy Habits", "exercise=tập thể dục|healthy=khỏe mạnh|diet=chế độ ăn|vegetable=rau củ|run=chạy|swim=bơi|relax=thư giãn|habit=thói quen")
      ]),
      T("a2-work", "💼", "#fdf1e6", "Work", "Công việc", [
        L("Jobs", "doctor=bác sĩ|nurse=y tá|engineer=kỹ sư|farmer=nông dân|driver=tài xế|chef=đầu bếp|police=cảnh sát|worker=công nhân"),
        L("At the Office", "computer=máy tính|meeting=cuộc họp|boss=sếp|colleague=đồng nghiệp|email=thư điện tử|printer=máy in|schedule=lịch trình|project=dự án"),
        L("Work Life", "salary=tiền lương|job=công việc|busy=bận rộn|deadline=hạn chót|interview=phỏng vấn|career=sự nghiệp|skill=kỹ năng|hire=tuyển dụng")
      ])
    ]
  },

  // ---------------------------------------------------------------- B1
  {
    code: "B1", name: "Trung cấp", desc: "Mở rộng vốn từ, diễn đạt ý kiến",
    topics: [
      T("b1-environment", "🌿", "#e8f6ee", "Environment", "Môi trường", [
        L("Nature", "forest=rừng|ocean=đại dương|river=sông|mountain=núi|climate=khí hậu|wildlife=động vật hoang dã|desert=sa mạc|island=hòn đảo"),
        L("Pollution", "pollution=sự ô nhiễm|waste=rác thải|plastic=nhựa|smoke=khói|chemical=hóa chất|damage=thiệt hại|dirty=bẩn|harmful=có hại"),
        L("Protecting the Planet", "recycle=tái chế|reduce=giảm bớt|reuse=tái sử dụng|energy=năng lượng|solar=thuộc mặt trời|protect=bảo vệ|save=tiết kiệm|sustainable=bền vững")
      ]),
      T("b1-technology", "💻", "#eef4fd", "Technology", "Công nghệ", [
        L("Devices", "laptop=máy tính xách tay|screen=màn hình|keyboard=bàn phím|battery=pin|charger=bộ sạc|device=thiết bị|camera=máy ảnh|speaker=loa"),
        L("Digital Skills", "software=phần mềm|download=tải xuống|install=cài đặt|update=cập nhật|data=dữ liệu|search=tìm kiếm|file=tệp tin|website=trang web"),
        L("Innovation", "invent=phát minh|robot=người máy|artificial=nhân tạo|develop=phát triển|research=nghiên cứu|future=tương lai|digital=kỹ thuật số|automatic=tự động")
      ]),
      T("b1-communication", "💬", "#f1ecfd", "Communication", "Giao tiếp", [
        L("Conversations", "opinion=ý kiến|agree=đồng ý|disagree=không đồng ý|explain=giải thích|suggest=gợi ý|discuss=thảo luận|mention=đề cập|respond=phản hồi"),
        L("Emotions", "anxious=lo lắng|confident=tự tin|disappointed=thất vọng|excited=hào hứng|embarrassed=xấu hổ|grateful=biết ơn|jealous=ghen tị|relieved=nhẹ nhõm"),
        L("Persuasion", "convince=thuyết phục|argument=lập luận|evidence=bằng chứng|benefit=lợi ích|reason=lý do|compare=so sánh|prefer=thích hơn|recommend=đề xuất")
      ])
    ]
  },

  // ---------------------------------------------------------------- B2
  {
    code: "B2", name: "Trung cao cấp", desc: "Dùng từ linh hoạt, chuyên sâu hơn",
    topics: [
      T("b2-business", "📈", "#fdf6e3", "Business", "Kinh doanh", [
        L("Companies", "company=công ty|customer=khách hàng|profit=lợi nhuận|revenue=doanh thu|competitor=đối thủ cạnh tranh|brand=thương hiệu|strategy=chiến lược|investment=sự đầu tư"),
        L("Negotiation", "negotiate=đàm phán|contract=hợp đồng|offer=lời đề nghị|deal=thỏa thuận|compromise=thỏa hiệp|budget=ngân sách|discount=giảm giá|condition=điều kiện"),
        L("E-commerce", "e-commerce=thương mại điện tử|checkout=thanh toán|delivery=giao hàng|refund=hoàn tiền|inventory=hàng tồn kho|review=đánh giá|shipping=vận chuyển|platform=nền tảng")
      ]),
      T("b2-society", "🏙️", "#eef4fd", "Society", "Xã hội", [
        L("Community", "community=cộng đồng|citizen=công dân|volunteer=tình nguyện viên|government=chính phủ|law=luật pháp|rights=các quyền|population=dân số|tradition=truyền thống"),
        L("Social Issues", "poverty=nghèo đói|unemployment=thất nghiệp|equality=bình đẳng|crime=tội phạm|education=giáo dục|housing=nhà ở|inflation=lạm phát|discrimination=phân biệt đối xử"),
        L("Culture", "heritage=di sản|festival=lễ hội|custom=phong tục|identity=bản sắc|diverse=đa dạng|generation=thế hệ|influence=ảnh hưởng|values=giá trị")
      ]),
      T("b2-science", "🔬", "#e8f6ee", "Science", "Khoa học", [
        L("Research", "experiment=thí nghiệm|hypothesis=giả thuyết|result=kết quả|analyze=phân tích|method=phương pháp|theory=lý thuyết|observe=quan sát|conclusion=kết luận"),
        L("Space", "planet=hành tinh|galaxy=thiên hà|orbit=quỹ đạo|gravity=trọng lực|astronaut=phi hành gia|telescope=kính thiên văn|universe=vũ trụ|satellite=vệ tinh"),
        L("Health Science", "vaccine=vắc-xin|virus=vi-rút|cell=tế bào|gene=gen|immune=miễn dịch|disease=bệnh tật|treatment=điều trị|prevent=phòng ngừa")
      ])
    ]
  }
];