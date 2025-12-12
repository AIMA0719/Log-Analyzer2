
import React, { useState, useMemo } from 'react';
import { ConnectionDiagnosis, SessionMetadata, CsDiagnosisType } from '../types';
import { Stethoscope, MessageSquare, Copy, Check, Globe } from 'lucide-react';

interface ConnectionStatusProps {
  diagnosis: ConnectionDiagnosis;
  metadata: SessionMetadata;
}

type LanguageCode = 
  | 'KO' | 'EN' | 'JA' | 'ZH-CN' | 'ZH-TW' | 'FR' | 'DE' | 'HI' | 'ID' 
  | 'IT' | 'MS' | 'FA' | 'PL' | 'PT' | 'RU' | 'ES' | 'TH' | 'TR' | 'UK' | 'VI' | 'AR';

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  'KO': '한국어 (Korean)',
  'EN': 'English',
  'JA': '日本語 (Japanese)',
  'ZH-CN': '简体中文 (Chinese Simplified)',
  'ZH-TW': '繁體中文 (Chinese Traditional)',
  'FR': 'Français (French)',
  'DE': 'Deutsch (German)',
  'HI': 'हिन्दी (Hindi)',
  'ID': 'Bahasa Indonesia',
  'IT': 'Italiano (Italian)',
  'MS': 'Bahasa Melayu (Malay)',
  'FA': 'فارسی (Persian)',
  'PL': 'Polski (Polish)',
  'PT': 'Português (Portuguese)',
  'RU': 'Русский (Russian)',
  'ES': 'Español (Spanish)',
  'TH': 'ไทย (Thai)',
  'TR': 'Türkçe (Turkish)',
  'UK': 'Українська (Ukrainian)',
  'VI': 'Tiếng Việt (Vietnamese)',
  'AR': 'العربية (Arabic)',
};

// Unified Template Dictionary
const CS_TEMPLATES: Record<LanguageCode, Record<CsDiagnosisType, string>> = {
  // 1. 한국어 (Korean)
  'KO': {
    'GENERAL_CONNECTION': `안녕하십니까 인포카입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.
\n
고객님께서 프로토콜로 인한 연결 관련 어려움을 겪으신 것으로 보입니다.
네트워크가 원활한 상태에서 설정 -> 스캐너 연결 -> 상단의 "연결 문제 확인하기" 탭을 누르신 뒤 해당 내용 확인 부탁 드립니다.

또한 
1. 앱 내 [설정] -> [프로토콜&데이터] 기능을 통해 [응답 대기시간] 및 [재연결 횟수] 늘리기.
2. [프로토콜 종류]에서 프로토콜을 순차적으로 바꾸면서 데이터가 정상적으로 표시되어지는지 확인 부탁 드립니다. (먼저 6번 시도 부탁 드립니다.)

추가적으로 다른 궁금하신 사항이 있으시다면 앱 메인 페이지에서 "사용 가이드" 확인 부탁 드립니다.
\n
감사합니다.`,
    'NO_DATA_PROTOCOL': `안녕하십니까 인포카입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.
\n
고객님께서 호환되는 프로토콜과 연결이 되지 않아 "NO DATA" 가 응답 되며, 반복적인 비정상 응답으로인한 연결 종료가 된 것으로 보입니다.

아래 사항 참고 부탁 드립니다.
1. 앱 내 [설정] -> [프로토콜&데이터] 기능을 통해 [응답 대기시간] 및 [재연결 횟수] 늘리기.
2. [프로토콜 종류]에서 프로토콜을 순차적으로 바꾸면서 데이터가 정상적으로 표시되어지는지 확인 부탁 드립니다. (먼저 6번 시도 부탁 드립니다.)

그럼에도 데이터가 정상적으로 나오지 않는다면 고객님의 차량과 호환이 되지 않아 데이터가 나오지 않는것으로 판단됩니다.

추가적으로 다른 궁금하신 사항이 있으시다면 앱 메인 페이지에서 "사용 가이드" 확인 부탁 드립니다.
\n
감사합니다.`,
    'WIFI_CONNECTION': `안녕하세요 인포카입니다.
Wi-Fi 모듈 스캐너 연결에 어려움을 겪으신 것으로 보입니다.
이용에 불편함을 드려 죄송의 말씀 드립니다.
\n
해당 연결의 경우 
1. 디바이스 시스템 설정에서 Wi-Fi 와 Wi-Fi 스캐너와 연결
2. 그 후 인포카 앱 내에서 올바른 IP와 포트 연결 시도 부탁드립니다.

자세한 사항은 앱 내 사용 가이드 - 연결 부분 참고 부탁 드립니다.
\n
감사합니다`,
    'HUD_INTERFERENCE': `안녕하세요 인포카입니다
먼저 이용에 불편함을 드려서 죄송합니다
\n
보내주신 로그파일을 보았을때에 HUD 제품과 같이사용하시는 것으로 보입니다
HUD 제품과 동시에 사용 시 제품 간 데이터 충돌로 인해 데이터 수집이 어려울 수 있습니다.
Y 케이블을 사용하게 되면, 두 가지 제품에서 동시에 데이터 호출하여 ECU에서 정상적인 데이터를 보내지 않을 수 있습니다.
obd단자함에 인포카스캐너만 연결해주시기 바랍니다
\n
감사합니다.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 2. English (Default)
  'EN': {
    'GENERAL_CONNECTION': `Hello, this is Infocar.
We apologize for the inconvenience.
\n
It seems you are experiencing connection difficulties due to protocol issues.
Please ensure you have a stable network connection, then go to Settings -> Scanner Connection -> tap the "Check Connection Issues" tab at the top and check the details.

Additionally, please try the following:
1. Increase the [Response Timeout] and [Re-connection Count] in the app under [Settings] -> [Protocol & Data].
2. In [Protocol Type], try changing the protocols sequentially to see if the data is displayed correctly. (Please try number 6 first.)

If you have any further questions, please check the "User Guide" on the app's main page.
\n
Thank you.`,
    'NO_DATA_PROTOCOL': `Hello, this is Infocar.
We apologize for the inconvenience.
\n
It appears that "NO DATA" is being returned because a compatible protocol was not established, leading to connection termination due to repeated abnormal responses.

Please refer to the following:
1. Increase the [Response Timeout] and [Re-connection Count] in the app under [Settings] -> [Protocol & Data].
2. In [Protocol Type], try changing the protocols sequentially to see if the data is displayed correctly. (Please try number 6 first.)

If data still does not appear, it is determined that the device is not compatible with your vehicle.

If you have any further questions, please check the "User Guide" on the app's main page.
\n
Thank you.`,
    'WIFI_CONNECTION': `Hello, this is Infocar.
It seems you are having trouble connecting to the Wi-Fi module scanner.
We apologize for the inconvenience.
\n
For this connection, please try the following:
1. Connect to the Wi-Fi scanner in your device's System Settings -> Wi-Fi.
2. Then, attempt to connect using the correct IP and Port within the Infocar app.

For more details, please refer to the Connection section in the User Guide within the app.
\n
Thank you.`,
    'HUD_INTERFERENCE': `Hello, this is Infocar.
First, we apologize for the inconvenience.
\n
Looking at the log file you sent, it seems you are using a HUD product together with the scanner.
When used simultaneously with a HUD product, data collection may be difficult due to data collision between products.
If you use a Y-cable, both products may request data simultaneously, causing the ECU to fail to send normal data.
Please connect only the Infocar scanner to the OBD port.
\n
Thank you.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 3. Japanese
  'JA': {
    'GENERAL_CONNECTION': `こんにちは、インフォカーです。
ご利用にご不便をおかけして申し訳ございません。
\n
プロトコルの問題により接続が困難になっているようです。
ネットワークが安定した状態で、設定 -> スキャナー接続 -> 上部の「接続問題の確認」タブを押し、該当内容をご確認ください。

また、以下の方法もお試しください。
1. アプリ内の [設定] -> [プロトコル＆データ] 機能で [応答待機時間] および [再接続回数] を増やしてください。
2. [プロトコル種類] でプロトコルを順番に変更しながらデータが正常に表示されるか確認してください。（まず6番をお試しください。）

その他ご不明な点がございましたら、アプリメインページの「使用ガイド」をご確認ください。
\n
ありがとうございます。`,
    'NO_DATA_PROTOCOL': `こんにちは、インフォカーです。
ご利用にご不便をおかけして申し訳ございません。
\n
互換性のあるプロトコルと接続できず「NO DATA」が返され、繰り返しの異常応答により接続が終了したようです。

以下の事項をご参照ください。
1. アプリ内の [設定] -> [プロトコル＆データ] 機能で [応答待機時間] および [再接続回数] を増やしてください。
2. [プロトコル種類] でプロトコルを順番に変更しながらデータが正常に表示されるか確認してください。（まず6番をお試しください。）

それでもデータが正常に出ない場合は、お客様の車両と互換性がないためデータが表示されないものと判断されます。

その他ご不明な点がございましたら、アプリメインページの「使用ガイド」をご確認ください。
\n
ありがとうございます。`,
    'WIFI_CONNECTION': `こんにちは、インフォカーです。
Wi-Fiモジュールスキャナーの接続に問題が発生しているようです。
ご利用にご不便をおかけして申し訳ございません。
\n
当該接続の場合、以下をお試しください。
1. デバイスのシステム設定でWi-FiとWi-Fiスキャナーを接続してください。
2. その後、インフォカーアプリ内で正しいIPとポートで接続を試みてください。

詳細はアプリ内の使用ガイド - 接続部分をご参照ください。
\n
ありがとうございます。`,
    'HUD_INTERFERENCE': `こんにちは、インフォカーです。
まず、ご利用にご不便をおかけして申し訳ございません。
\n
お送りいただいたログファイルを確認したところ、HUD製品と併用されているようです。
HUD製品と同時に使用する場合、製品間のデータ衝突によりデータ収集が困難になることがあります。
Yケーブルを使用すると、2つの製品で同時にデータを呼び出すため、ECUから正常なデータが送信されない場合があります。
OBDポートにはインフォカースキャナーのみを接続してください。
\n
ありがとうございます。`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 4. Chinese Simplified
  'ZH-CN': {
    'GENERAL_CONNECTION': `您好，这里是Infocar。
对于给您带来的不便，我们深表歉意。
\n
看来您遇到了因协议导致的连接困难。
请确保网络连接稳定，然后进入“设置” -> “扫描仪连接” -> 点击顶部的“检查连接问题”选项卡并查看详细信息。

此外，请尝试以下操作：
1. 在应用程序的 [设置] -> [协议与数据] 中增加 [响应超时] 和 [重连次数]。
2. 在 [协议类型] 中，尝试按顺序更改协议，查看数据是否正常显示。（请先尝试第6号。）

如有其他疑问，请查看应用程序主页上的“用户指南”。
\n
谢谢。`,
    'NO_DATA_PROTOCOL': `您好，这里是Infocar。
对于给您带来的不便，我们深表歉意。
\n
显示“NO DATA”似乎是因为未建立兼容的协议，导致因重复的异常响应而终止连接。

请参考以下内容：
1. 在应用程序的 [设置] -> [协议与数据] 中增加 [响应超时] 和 [重连次数]。
2. 在 [协议类型] 中，尝试按顺序更改协议，查看数据是否正常显示。（请先尝试第6号。）

如果数据仍然无法显示，则判定该设备与您的车辆不兼容。

如有其他疑问，请查看应用程序主页上的“用户指南”。
\n
谢谢。`,
    'WIFI_CONNECTION': `您好，这里是Infocar。
看来您在连接Wi-Fi模块扫描仪时遇到了问题。
对于给您带来的不便，我们深表歉意。
\n
对于此连接，请尝试以下操作：
1. 在设备的系统设置 -> Wi-Fi中连接到Wi-Fi扫描仪。
2. 然后，在Infocar应用程序中使用正确的IP和端口尝试连接。

更多详情，请参考应用程序内用户指南中的“连接”部分。
\n
谢谢。`,
    'HUD_INTERFERENCE': `您好，这里是Infocar。
首先，对于给您带来的不便，我们深表歉意。
\n
查看您发送的日志文件，您似乎正在将HUD产品与扫描仪一起使用。
当与HUD产品同时使用时，由于产品之间的数据冲突，可能会导致数据收集困难。
如果您使用Y型电缆，两个产品可能会同时请求数据，导致ECU无法发送正常数据。
请仅将Infocar扫描仪连接到OBD端口。
\n
谢谢。`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 5. Chinese Traditional
  'ZH-TW': {
    'GENERAL_CONNECTION': `您好，這裡是Infocar。
對於給您帶來的不便，我們深表歉意。
\n
看來您遇到了因協議導致的連接困難。
請確保網絡連接穩定，然後進入「設置」 -> 「掃描儀連接」 -> 點擊頂部的「檢查連接問題」選項卡並查看詳細信息。

此外，請嘗試以下操作：
1. 在應用程序的 [設置] -> [協議與數據] 中增加 [響應超時] 和 [重連次數]。
2. 在 [協議類型] 中，嘗試按順序更改協議，查看數據是否正常顯示。（請先嘗試第6號。）

如有其他疑問，請查看應用程序主頁上的「用戶指南」。
\n
謝謝。`,
    'NO_DATA_PROTOCOL': `您好，這裡是Infocar。
對於給您帶來的不便，我們深表歉意。
\n
顯示「NO DATA」似乎是因為未建立兼容的協議，導致因重複的異常響應而終止連接。

請參考以下內容：
1. 在應用程序的 [設置] -> [協議與數據] 中增加 [響應超時] 和 [重連次數]。
2. 在 [協議類型] 中，嘗試按順序更改協議，查看數據是否正常顯示。（請先嘗試第6號。）

如果數據仍然無法顯示，則判定該設備與您的車輛不兼容。

如有其他疑問，請查看應用程序主頁上的「用戶指南」。
\n
謝謝。`,
    'WIFI_CONNECTION': `您好，這裡是Infocar。
看來您在連接Wi-Fi模組掃描儀時遇到了問題。
對於給您帶來的不便，我們深表歉意。
\n
對於此連接，請嘗試以下操作：
1. 在設備的系統設置 -> Wi-Fi中連接到Wi-Fi掃描儀。
2. 然後，在Infocar應用程序中使用正確的IP和端口嘗試連接。

更多詳情，請參考應用程序內用戶指南中的「連接」部分。
\n
謝謝。`,
    'HUD_INTERFERENCE': `您好，這裡是Infocar。
首先，對於給您帶來的不便，我們深表歉意。
\n
查看您發送的日誌文件，您似乎正在將HUD產品與掃描儀一起使用。
當與HUD產品同時使用時，由於產品之間的數據衝突，可能會導致數據收集困難。
如果您使用Y型電纜，兩個產品可能會同時請求數據，導致ECU無法發送正常數據。
請僅將Infocar掃描儀連接到OBD端口。
\n
謝謝。`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 6. French
  'FR': {
    'GENERAL_CONNECTION': `Bonjour, c'est Infocar.
Nous nous excusons pour le désagrément.
\n
Il semble que vous rencontriez des difficultés de connexion dues à des problèmes de protocole.
Veuillez vous assurer d'avoir une connexion réseau stable, puis allez dans Paramètres -> Connexion Scanner -> appuyez sur l'onglet "Vérifier les problèmes de connexion" en haut et vérifiez les détails.

De plus, veuillez essayer ce qui suit :
1. Augmentez le [Délai de réponse] et le [Nombre de reconnexions] dans l'application sous [Paramètres] -> [Protocole et Données].
2. Dans [Type de protocole], essayez de changer les protocoles séquentiellement pour voir si les données s'affichent correctement. (Veuillez essayer le numéro 6 en premier.)

Si vous avez d'autres questions, veuillez consulter le "Guide de l'utilisateur" sur la page principale de l'application.
\n
Merci.`,
    'NO_DATA_PROTOCOL': `Bonjour, c'est Infocar.
Nous nous excusons pour le désagrément.
\n
Il semble que "NO DATA" soit renvoyé parce qu'un protocole compatible n'a pas été établi, entraînant la fin de la connexion en raison de réponses anormales répétées.

Veuillez vous référer à ce qui suit :
1. Augmentez le [Délai de réponse] et le [Nombre de reconnexions] dans l'application sous [Paramètres] -> [Protocole et Données].
2. Dans [Type de protocole], essayez de changer les protocoles séquentiellement pour voir si les données s'affichent correctement. (Veuillez essayer le numéro 6 en premier.)

Si les données n'apparaissent toujours pas, il est déterminé que l'appareil n'est pas compatible avec votre véhicule.

Si vous avez d'autres questions, veuillez consulter le "Guide de l'utilisateur" sur la page principale de l'application.
\n
Merci.`,
    'WIFI_CONNECTION': `Bonjour, c'est Infocar.
Il semble que vous ayez des difficultés à vous connecter au scanner Wi-Fi.
Nous nous excusons pour le désagrément.
\n
Pour cette connexion, veuillez essayer ce qui suit :
1. Connectez-vous au scanner Wi-Fi dans les Paramètres système de votre appareil -> Wi-Fi.
2. Ensuite, tentez de vous connecter en utilisant la bonne adresse IP et le bon port dans l'application Infocar.

Pour plus de détails, veuillez vous référer à la section Connexion du Guide de l'utilisateur dans l'application.
\n
Merci.`,
    'HUD_INTERFERENCE': `Bonjour, c'est Infocar.
Tout d'abord, nous nous excusons pour le désagrément.
\n
En regardant le fichier journal que vous avez envoyé, il semble que vous utilisiez un produit HUD avec le scanner.
Lorsqu'il est utilisé simultanément avec un produit HUD, la collecte de données peut être difficile en raison de conflits de données entre les produits.
Si vous utilisez un câble en Y, les deux produits peuvent demander des données simultanément, ce qui empêche l'ECU d'envoyer des données normales.
Veuillez connecter uniquement le scanner Infocar au port OBD.
\n
Merci.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 7. German
  'DE': {
    'GENERAL_CONNECTION': `Hallo, hier ist Infocar.
Wir entschuldigen uns für die Unannehmlichkeiten.
\n
Es scheint, dass Sie aufgrund von Protokollproblemen Verbindungsschwierigkeiten haben.
Bitte stellen Sie sicher, dass Sie eine stabile Netzwerkverbindung haben, gehen Sie dann zu Einstellungen -> Scannerverbindung -> tippen Sie oben auf den Tab "Verbindungsprobleme prüfen" und überprüfen Sie die Details.

Bitte versuchen Sie zusätzlich Folgendes:
1. Erhöhen Sie das [Antwort-Timeout] und die [Anzahl der Wiederverbindungen] in der App unter [Einstellungen] -> [Protokoll & Daten].
2. Ändern Sie unter [Protokolltyp] die Protokolle nacheinander, um zu sehen, ob die Daten korrekt angezeigt werden. (Bitte versuchen Sie zuerst Nummer 6.)

Wenn Sie weitere Fragen haben, lesen Sie bitte das "Benutzerhandbuch" auf der Hauptseite der App.
\n
Danke.`,
    'NO_DATA_PROTOCOL': `Hallo, hier ist Infocar.
Wir entschuldigen uns für die Unannehmlichkeiten.
\n
Es scheint, dass "NO DATA" zurückgegeben wird, da kein kompatibles Protokoll erstellt wurde, was aufgrund wiederholter abnormaler Antworten zum Verbindungsabbruch führt.

Bitte beachten Sie Folgendes:
1. Erhöhen Sie das [Antwort-Timeout] und die [Anzahl der Wiederverbindungen] in der App unter [Einstellungen] -> [Protokoll & Daten].
2. Ändern Sie unter [Protokolltyp] die Protokolle nacheinander, um zu sehen, ob die Daten korrekt angezeigt werden. (Bitte versuchen Sie zuerst Nummer 6.)

Wenn immer noch keine Daten angezeigt werden, ist das Gerät nicht mit Ihrem Fahrzeug kompatibel.

Wenn Sie weitere Fragen haben, lesen Sie bitte das "Benutzerhandbuch" auf der Hauptseite der App.
\n
Danke.`,
    'WIFI_CONNECTION': `Hallo, hier ist Infocar.
Es scheint, dass Sie Probleme haben, eine Verbindung zum Wi-Fi-Modul-Scanner herzustellen.
Wir entschuldigen uns für die Unannehmlichkeiten.
\n
Bitte versuchen Sie für diese Verbindung Folgendes:
1. Verbinden Sie sich in den Systemeinstellungen Ihres Geräts -> Wi-Fi mit dem Wi-Fi-Scanner.
2. Versuchen Sie dann, in der Infocar-App eine Verbindung mit der richtigen IP und dem richtigen Port herzustellen.

Weitere Informationen finden Sie im Abschnitt Verbindung im Benutzerhandbuch der App.
\n
Danke.`,
    'HUD_INTERFERENCE': `Hallo, hier ist Infocar.
Zunächst entschuldigen wir uns für die Unannehmlichkeiten.
\n
Beim Betrachten der von Ihnen gesendeten Protokolldatei scheint es, dass Sie ein HUD-Produkt zusammen mit dem Scanner verwenden.
Bei gleichzeitiger Verwendung mit einem HUD-Produkt kann die Datenerfassung aufgrund von Datenkollisionen zwischen den Produkten schwierig sein.
Wenn Sie ein Y-Kabel verwenden, fordern beide Produkte möglicherweise gleichzeitig Daten an, wodurch das Steuergerät (ECU) keine normalen Daten senden kann.
Bitte schließen Sie nur den Infocar-Scanner an den OBD-Anschluss an.
\n
Danke.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 8. Hindi
  'HI': {
    'GENERAL_CONNECTION': `नमस्ते, यह Infocar है।
असुविधा के लिए हमें खेद है।
\n
ऐसा लगता है कि आपको प्रोटोकॉल समस्याओं के कारण कनेक्शन में कठिनाइयों का सामना करना पड़ रहा है।
कृपया सुनिश्चित करें कि आपके पास एक स्थिर नेटवर्क कनेक्शन है, फिर सेटिंग्स -> स्कैनर कनेक्शन -> ऊपर "कनेक्शन समस्याओं की जाँच करें" टैब पर टैप करें और विवरण देखें।

इसके अतिरिक्त, कृपया निम्नलिखित प्रयास करें:
1. ऐप में [सेटिंग्स] -> [प्रोटोकॉल और डेटा] के तहत [प्रतिक्रिया टाइमआउट] और [पुनः कनेक्शन गिनती] बढ़ाएं।
2. [प्रोटोकॉल प्रकार] में, यह देखने के लिए प्रोटोकॉल को क्रमिक रूप से बदलने का प्रयास करें कि क्या डेटा सही ढंग से प्रदर्शित होता है। (कृपया पहले नंबर 6 का प्रयास करें।)

यदि आपके कोई और प्रश्न हैं, तो कृपया ऐप के मुख्य पृष्ठ पर "उपयोगकर्ता गाइड" देखें।
\n
धन्यवाद।`,
    'NO_DATA_PROTOCOL': `नमस्ते, यह Infocar है।
असुविधा के लिए हमें खेद है।
\n
ऐसा प्रतीत होता है कि "NO DATA" वापस किया जा रहा है क्योंकि एक संगत प्रोटोकॉल स्थापित नहीं किया गया था, जिससे बार-बार असामान्य प्रतिक्रियाओं के कारण कनेक्शन समाप्त हो गया।

कृपया निम्नलिखित देखें:
1. ऐप में [सेटिंग्स] -> [प्रोटोकॉल और डेटा] के तहत [प्रतिक्रिया टाइमआउट] और [पुनः कनेक्शन गिनती] बढ़ाएं।
2. [प्रोटोकॉल प्रकार] में, यह देखने के लिए प्रोटोकॉल को क्रमिक रूप से बदलने का प्रयास करें कि क्या डेटा सही ढंग से प्रदर्शित होता है। (कृपया पहले नंबर 6 का प्रयास करें।)

यदि डेटा अभी भी दिखाई नहीं देता है, तो यह निर्धारित किया जाता है कि डिवाइस आपके वाहन के साथ संगत नहीं है।

यदि आपके कोई और प्रश्न हैं, तो कृपया ऐप के मुख्य पृष्ठ पर "उपयोगकर्ता गाइड" देखें।
\n
धन्यवाद।`,
    'WIFI_CONNECTION': `नमस्ते, यह Infocar है।
ऐसा लगता है कि आपको वाई-फाई मॉड्यूल स्कैनर से कनेक्ट करने में परेशानी हो रही है।
असुविधा के लिए हमें खेद है।
\n
इस कनेक्शन के लिए, कृपया निम्नलिखित प्रयास करें:
1. अपने डिवाइस की सिस्टम सेटिंग्स -> वाई-फाई में वाई-फाई स्कैनर से कनेक्ट करें।
2. फिर, Infocar ऐप के भीतर सही IP और पोर्ट का उपयोग करके कनेक्ट करने का प्रयास करें।

अधिक विवरण के लिए, कृपया ऐप के भीतर उपयोगकर्ता गाइड में कनेक्शन अनुभाग देखें।
\n
धन्यवाद।`,
    'HUD_INTERFERENCE': `नमस्ते, यह Infocar है।
सबसे पहले, असुविधा के लिए हमें खेद है।
\n
आपके द्वारा भेजी गई लॉग फ़ाइल को देखते हुए, ऐसा लगता है कि आप स्कैनर के साथ HUD उत्पाद का उपयोग कर रहे हैं।
HUD उत्पाद के साथ एक साथ उपयोग करने पर, उत्पादों के बीच डेटा टकराव के कारण डेटा संग्रह मुश्किल हो सकता है।
यदि आप Y-केबल का उपयोग करते हैं, तो दोनों उत्पाद एक साथ डेटा का अनुरोध कर सकते हैं, जिससे ECU सामान्य डेटा भेजने में विफल हो जाता है।
कृपया केवल Infocar स्कैनर को OBD पोर्ट से कनेक्ट करें।
\n
धन्यवाद।`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 9. Indonesian
  'ID': {
    'GENERAL_CONNECTION': `Halo, ini Infocar.
Kami mohon maaf atas ketidaknyamanan ini.
\n
Tampaknya Anda mengalami kesulitan koneksi karena masalah protokol.
Pastikan Anda memiliki koneksi jaringan yang stabil, lalu buka Pengaturan -> Koneksi Pemindai -> ketuk tab "Periksa Masalah Koneksi" di bagian atas dan periksa detailnya.

Selain itu, silakan coba langkah berikut:
1. Tingkatkan [Batas Waktu Respons] dan [Jumlah Koneksi Ulang] di aplikasi pada menu [Pengaturan] -> [Protokol & Data].
2. Pada [Tipe Protokol], coba ubah protokol secara berurutan untuk melihat apakah data ditampilkan dengan benar. (Silakan coba nomor 6 terlebih dahulu.)

Jika Anda memiliki pertanyaan lebih lanjut, silakan periksa "Panduan Pengguna" di halaman utama aplikasi.
\n
Terima kasih.`,
    'NO_DATA_PROTOCOL': `Halo, ini Infocar.
Kami mohon maaf atas ketidaknyamanan ini.
\n
Tampaknya "NO DATA" dikembalikan karena protokol yang kompatibel tidak terbentuk, menyebabkan pemutusan koneksi karena respons abnormal yang berulang.

Silakan merujuk ke langkah berikut:
1. Tingkatkan [Batas Waktu Respons] dan [Jumlah Koneksi Ulang] di aplikasi pada menu [Pengaturan] -> [Protokol & Data].
2. Pada [Tipe Protokol], coba ubah protokol secara berurutan untuk melihat apakah data ditampilkan dengan benar. (Silakan coba nomor 6 terlebih dahulu.)

Jika data masih tidak muncul, perangkat dipastikan tidak kompatibel dengan kendaraan Anda.

Jika Anda memiliki pertanyaan lebih lanjut, silakan periksa "Panduan Pengguna" di halaman utama aplikasi.
\n
Terima kasih.`,
    'WIFI_CONNECTION': `Halo, ini Infocar.
Tampaknya Anda mengalami masalah saat menghubungkan ke pemindai modul Wi-Fi.
Kami mohon maaf atas ketidaknyamanan ini.
\n
Untuk koneksi ini, silakan coba langkah berikut:
1. Hubungkan ke pemindai Wi-Fi di Pengaturan Sistem perangkat Anda -> Wi-Fi.
2. Kemudian, coba hubungkan menggunakan IP dan Port yang benar di dalam aplikasi Infocar.

Untuk detail lebih lanjut, silakan merujuk ke bagian Koneksi di Panduan Pengguna dalam aplikasi.
\n
Terima kasih.`,
    'HUD_INTERFERENCE': `Halo, ini Infocar.
Pertama, kami mohon maaf atas ketidaknyamanan ini.
\n
Melihat file log yang Anda kirim, tampaknya Anda menggunakan produk HUD bersama dengan pemindai.
Saat digunakan bersamaan dengan produk HUD, pengumpulan data mungkin sulit dilakukan karena tabrakan data antar produk.
Jika Anda menggunakan kabel Y, kedua produk mungkin meminta data secara bersamaan, menyebabkan ECU gagal mengirim data normal.
Harap hubungkan hanya pemindai Infocar ke port OBD.
\n
Terima kasih.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 10. Italian
  'IT': {
    'GENERAL_CONNECTION': `Ciao, qui è Infocar.
Ci scusiamo per il disagio.
\n
Sembra che tu stia riscontrando difficoltà di connessione a causa di problemi di protocollo.
Assicurati di avere una connessione di rete stabile, quindi vai su Impostazioni -> Connessione Scanner -> tocca la scheda "Verifica problemi di connessione" in alto e controlla i dettagli.

Inoltre, prova quanto segue:
1. Aumenta il [Timeout risposta] e il [Conteggio riconnessioni] nell'app in [Impostazioni] -> [Protocollo e dati].
2. In [Tipo protocollo], prova a cambiare i protocolli in sequenza per vedere se i dati vengono visualizzati correttamente. (Prova prima il numero 6.)

Se hai altre domande, consulta la "Guida utente" nella pagina principale dell'app.
\n
Grazie.`,
    'NO_DATA_PROTOCOL': `Ciao, qui è Infocar.
Ci scusiamo per il disagio.
\n
Sembra che venga restituito "NO DATA" perché non è stato stabilito un protocollo compatibile, portando alla terminazione della connessione a causa di risposte anomale ripetute.

Fai riferimento a quanto segue:
1. Aumenta il [Timeout risposta] e il [Conteggio riconnessioni] nell'app in [Impostazioni] -> [Protocollo e dati].
2. In [Tipo protocollo], prova a cambiare i protocolli in sequenza per vedere se i dati vengono visualizzati correttamente. (Prova prima il numero 6.)

Se i dati non appaiono ancora, è determinato che il dispositivo non è compatibile con il tuo veicolo.

Se hai altre domande, consulta la "Guida utente" nella pagina principale dell'app.
\n
Grazie.`,
    'WIFI_CONNECTION': `Ciao, qui è Infocar.
Sembra che tu abbia problemi a connetterti allo scanner del modulo Wi-Fi.
Ci scusiamo per il disagio.
\n
Per questa connessione, prova quanto segue:
1. Connettiti allo scanner Wi-Fi nelle Impostazioni di sistema del tuo dispositivo -> Wi-Fi.
2. Quindi, tenta di connetterti utilizzando l'IP e la porta corretti all'interno dell'app Infocar.

Per maggiori dettagli, consulta la sezione Connessione nella Guida utente all'interno dell'app.
\n
Grazie.`,
    'HUD_INTERFERENCE': `Ciao, qui è Infocar.
Innanzitutto, ci scusiamo per il disagio.
\n
Guardando il file di registro che hai inviato, sembra che tu stia utilizzando un prodotto HUD insieme allo scanner.
Quando utilizzato contemporaneamente a un prodotto HUD, la raccolta dei dati potrebbe essere difficile a causa della collisione dei dati tra i prodotti.
Se si utilizza un cavo a Y, entrambi i prodotti potrebbero richiedere dati contemporaneamente, impedendo alla centralina (ECU) di inviare dati normali.
Collega solo lo scanner Infocar alla porta OBD.
\n
Grazie.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 11. Malay
  'MS': {
    'GENERAL_CONNECTION': `Halo, ini Infocar.
Kami memohon maaf atas kesulitan ini.
\n
Nampaknya anda mengalami masalah sambungan disebabkan isu protokol.
Sila pastikan anda mempunyai sambungan rangkaian yang stabil, kemudian pergi ke Tetapan -> Sambungan Pengimbas -> ketik tab "Semak Masalah Sambungan" di bahagian atas dan semak butirannya.

Selain itu, sila cuba langkah berikut:
1. Tingkatkan [Tamat Masa Respons] dan [Kiraan Sambung Semula] dalam aplikasi di bawah [Tetapan] -> [Protokol & Data].
2. Dalam [Jenis Protokol], cuba tukar protokol secara berurutan untuk melihat jika data dipaparkan dengan betul. (Sila cuba nombor 6 dahulu.)

Jika anda mempunyai sebarang soalan lanjut, sila semak "Panduan Pengguna" di halaman utama aplikasi.
\n
Terima kasih.`,
    'NO_DATA_PROTOCOL': `Halo, ini Infocar.
Kami memohon maaf atas kesulitan ini.
\n
Nampaknya "NO DATA" dikembalikan kerana protokol yang serasi tidak ditubuhkan, menyebabkan penamatan sambungan akibat respons tidak normal yang berulang.

Sila rujuk perkara berikut:
1. Tingkatkan [Tamat Masa Respons] dan [Kiraan Sambung Semula] dalam aplikasi di bawah [Tetapan] -> [Protokol & Data].
2. Dalam [Jenis Protokol], cuba tukar protokol secara berurutan untuk melihat jika data dipaparkan dengan betul. (Sila cuba nombor 6 dahulu.)

Jika data masih tidak muncul, peranti tersebut disahkan tidak serasi dengan kenderaan anda.

Jika anda mempunyai sebarang soalan lanjut, sila semak "Panduan Pengguna" di halaman utama aplikasi.
\n
Terima kasih.`,
    'WIFI_CONNECTION': `Halo, ini Infocar.
Nampaknya anda menghadapi masalah menyambung ke pengimbas modul Wi-Fi.
Kami memohon maaf atas kesulitan ini.
\n
Untuk sambungan ini, sila cuba langkah berikut:
1. Sambung ke pengimbas Wi-Fi dalam Tetapan Sistem peranti anda -> Wi-Fi.
2. Kemudian, cuba sambung menggunakan IP dan Port yang betul dalam aplikasi Infocar.

Untuk butiran lanjut, sila rujuk bahagian Sambungan dalam Panduan Pengguna dalam aplikasi.
\n
Terima kasih.`,
    'HUD_INTERFERENCE': `Halo, ini Infocar.
Pertama sekali, kami memohon maaf atas kesulitan ini.
\n
Melihat fail log yang anda hantar, nampaknya anda menggunakan produk HUD bersama dengan pengimbas.
Apabila digunakan serentak dengan produk HUD, pengumpulan data mungkin sukar disebabkan perlanggaran data antara produk.
Jika anda menggunakan kabel Y, kedua-dua produk mungkin meminta data secara serentak, menyebabkan ECU gagal menghantar data normal.
Sila sambungkan hanya pengimbas Infocar ke port OBD.
\n
Terima kasih.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 12. Persian
  'FA': {
    'GENERAL_CONNECTION': `سلام، این Infocar است.
بابت مشکل پیش آمده عذرخواهی می‌کنیم.
\n
به نظر می‌رسد به دلیل مشکلات پروتکل با مشکل اتصال مواجه شده‌اید.
لطفاً مطمئن شوید که اتصال شبکه پایداری دارید، سپس به تنظیمات -> اتصال اسکنر بروید -> روی تب "بررسی مشکلات اتصال" در بالا ضربه بزنید و جزئیات را بررسی کنید.

علاوه بر این، لطفاً موارد زیر را امتحان کنید:
1. [زمان انتظار پاسخ] و [تعداد اتصال مجدد] را در برنامه در بخش [تنظیمات] -> [پروتکل و داده‌ها] افزایش دهید.
2. در [نوع پروتکل]، سعی کنید پروتکل‌ها را به ترتیب تغییر دهید تا ببینید آیا داده‌ها به درستی نمایش داده می‌شوند یا خیر. (لطفاً ابتدا شماره 6 را امتحان کنید.)

اگر سوالات دیگری دارید، لطفاً "راهنمای کاربر" را در صفحه اصلی برنامه بررسی کنید.
\n
با تشکر.`,
    'NO_DATA_PROTOCOL': `سلام، این Infocar است.
بابت مشکل پیش آمده عذرخواهی می‌کنیم.
\n
به نظر می‌رسد "NO DATA" بازگردانده می‌شود زیرا پروتکل سازگاری ایجاد نشده است، که منجر به قطع اتصال به دلیل پاسخ‌های غیرعادی مکرر می‌شود.

لطفاً به موارد زیر مراجعه کنید:
1. [زمان انتظار پاسخ] و [تعداد اتصال مجدد] را در برنامه در بخش [تنظیمات] -> [پروتکل و داده‌ها] افزایش دهید.
2. در [نوع پروتکل]، سعی کنید پروتکل‌ها را به ترتیب تغییر دهید تا ببینید آیا داده‌ها به درستی نمایش داده می‌شوند یا خیر. (لطفاً ابتدا شماره 6 را امتحان کنید.)

اگر داده‌ها هنوز ظاهر نمی‌شوند، مشخص می‌شود که دستگاه با وسیله نقلیه شما سازگار نیست.

اگر سوالات دیگری دارید، لطفاً "راهنمای کاربر" را در صفحه اصلی برنامه بررسی کنید.
\n
با تشکر.`,
    'WIFI_CONNECTION': `سلام، این Infocar است.
به نظر می‌رسد در اتصال به اسکنر ماژول Wi-Fi مشکل دارید.
بابت مشکل پیش آمده عذرخواهی می‌کنیم.
\n
برای این اتصال، لطفاً موارد زیر را امتحان کنید:
1. در تنظیمات سیستم دستگاه خود -> Wi-Fi به اسکنر Wi-Fi متصل شوید.
2. سپس، سعی کنید با استفاده از IP و پورت صحیح در برنامه Infocar متصل شوید.

برای جزئیات بیشتر، لطفاً به بخش اتصال در راهنمای کاربر در برنامه مراجعه کنید.
\n
با تشکر.`,
    'HUD_INTERFERENCE': `سلام، این Infocar است.
ابتدا، بابت مشکل پیش آمده عذرخواهی می‌کنیم.
\n
با نگاهی به فایل لاگی که ارسال کرده‌اید، به نظر می‌رسد از یک محصول HUD همراه با اسکنر استفاده می‌کنید.
هنگامی که همزمان با یک محصول HUD استفاده می‌شود، جمع‌آوری داده‌ها ممکن است به دلیل تداخل داده‌ها بین محصولات دشوار باشد.
اگر از کابل Y استفاده می‌کنید، هر دو محصول ممکن است همزمان درخواست داده کنند که باعث می‌شود ECU نتواند داده‌های عادی ارسال کند.
لطفاً فقط اسکنر Infocar را به پورت OBD متصل کنید.
\n
با تشکر.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 13. Polish
  'PL': {
    'GENERAL_CONNECTION': `Witaj, tu Infocar.
Przepraszamy za niedogodności.
\n
Wygląda na to, że masz problemy z połączeniem z powodu problemów z protokołem.
Upewnij się, że masz stabilne połączenie sieciowe, a następnie przejdź do Ustawienia -> Połączenie skanera -> dotknij zakładki "Sprawdź problemy z połączeniem" u góry i sprawdź szczegóły.

Dodatkowo spróbuj wykonać następujące czynności:
1. Zwiększ [Limit czasu odpowiedzi] i [Liczbę ponownych połączeń] w aplikacji w sekcji [Ustawienia] -> [Protokół i dane].
2. W [Typ protokołu] spróbuj zmieniać protokoły sekwencyjnie, aby sprawdzić, czy dane są wyświetlane poprawnie. (Spróbuj najpierw numeru 6.)

Jeśli masz dodatkowe pytania, sprawdź "Instrukcję obsługi" na stronie głównej aplikacji.
\n
Dziękujemy.`,
    'NO_DATA_PROTOCOL': `Witaj, tu Infocar.
Przepraszamy za niedogodności.
\n
Wygląda na to, że zwracane jest "NO DATA", ponieważ nie ustanowiono zgodnego protokołu, co prowadzi do zakończenia połączenia z powodu powtarzających się nieprawidłowych odpowiedzi.

Zapoznaj się z poniższymi informacjami:
1. Zwiększ [Limit czasu odpowiedzi] i [Liczbę ponownych połączeń] w aplikacji w sekcji [Ustawienia] -> [Protokół i dane].
2. W [Typ protokołu] spróbuj zmieniać protokoły sekwencyjnie, aby sprawdzić, czy dane są wyświetlane poprawnie. (Spróbuj najpierw numeru 6.)

Jeśli dane nadal się nie pojawiają, oznacza to, że urządzenie nie jest kompatybilne z Twoim pojazdem.

Jeśli masz dodatkowe pytania, sprawdź "Instrukcję obsługi" na stronie głównej aplikacji.
\n
Dziękujemy.`,
    'WIFI_CONNECTION': `Witaj, tu Infocar.
Wygląda na to, że masz problem z połączeniem ze skanerem modułu Wi-Fi.
Przepraszamy za niedogodności.
\n
W przypadku tego połączenia spróbuj wykonać następujące czynności:
1. Połącz się ze skanerem Wi-Fi w Ustawieniach systemowych urządzenia -> Wi-Fi.
2. Następnie spróbuj połączyć się przy użyciu prawidłowego adresu IP i portu w aplikacji Infocar.

Więcej szczegółów znajdziesz w sekcji Połączenie w Instrukcji obsługi w aplikacji.
\n
Dziękujemy.`,
    'HUD_INTERFERENCE': `Witaj, tu Infocar.
Przede wszystkim przepraszamy za niedogodności.
\n
Patrząc na przesłany plik dziennika, wygląda na to, że używasz produktu HUD razem ze skanerem.
Podczas jednoczesnego korzystania z produktem HUD zbieranie danych może być trudne z powodu kolizji danych między produktami.
Jeśli używasz kabla Y, oba produkty mogą jednocześnie żądać danych, powodując, że ECU nie będzie w stanie wysłać normalnych danych.
Proszę podłączyć tylko skaner Infocar do portu OBD.
\n
Dziękujemy.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 14. Portuguese
  'PT': {
    'GENERAL_CONNECTION': `Olá, aqui é a Infocar.
Pedimos desculpas pelo inconveniente.
\n
Parece que você está enfrentando dificuldades de conexão devido a problemas de protocolo.
Certifique-se de ter uma conexão de rede estável, vá para Configurações -> Conexão do Scanner -> toque na guia "Verificar Problemas de Conexão" na parte superior e verifique os detalhes.

Além disso, tente o seguinte:
1. Aumente o [Tempo Limite de Resposta] e a [Contagem de Reconexão] no aplicativo em [Configurações] -> [Protocolo e Dados].
2. Em [Tipo de Protocolo], tente alterar os protocolos sequencialmente para ver se os dados são exibidos corretamente. (Tente o número 6 primeiro.)

Se tiver mais perguntas, verifique o "Guia do Usuário" na página principal do aplicativo.
\n
Obrigado.`,
    'NO_DATA_PROTOCOL': `Olá, aqui é a Infocar.
Pedimos desculpas pelo inconveniente.
\n
Parece que "NO DATA" está sendo retornado porque um protocolo compatível não foi estabelecido, levando ao encerramento da conexão devido a respostas anormais repetidas.

Consulte o seguinte:
1. Aumente o [Tempo Limite de Resposta] e a [Contagem de Reconexão] no aplicativo em [Configurações] -> [Protocolo e Dados].
2. Em [Tipo de Protocolo], tente alterar os protocolos sequencialmente para ver se os dados são exibidos corretamente. (Tente o número 6 primeiro.)

Se os dados ainda não aparecerem, é determinado que o dispositivo não é compatível com seu veículo.

Se tiver mais perguntas, verifique o "Guia do Usuário" na página principal do aplicativo.
\n
Obrigado.`,
    'WIFI_CONNECTION': `Olá, aqui é a Infocar.
Parece que você está com problemas para conectar ao scanner do módulo Wi-Fi.
Pedimos desculpas pelo inconveniente.
\n
Para esta conexão, tente o seguinte:
1. Conecte-se ao scanner Wi-Fi nas Configurações do Sistema do seu dispositivo -> Wi-Fi.
2. Em seguida, tente conectar usando o IP e a Porta corretos no aplicativo Infocar.

Para mais detalhes, consulte a seção Conexão no Guia do Usuário dentro do aplicativo.
\n
Obrigado.`,
    'HUD_INTERFERENCE': `Olá, aqui é a Infocar.
Primeiramente, pedimos desculpas pelo inconveniente.
\n
Olhando o arquivo de log que você enviou, parece que você está usando um produto HUD junto com o scanner.
Quando usado simultaneamente com um produto HUD, a coleta de dados pode ser difícil devido à colisão de dados entre os produtos.
Se você usar um cabo Y, ambos os produtos podem solicitar dados simultaneamente, fazendo com que a ECU falhe ao enviar dados normais.
Por favor, conecte apenas o scanner Infocar à porta OBD.
\n
Obrigado.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 15. Russian
  'RU': {
    'GENERAL_CONNECTION': `Здравствуйте, это Infocar.
Приносим извинения за неудобства.
\n
Похоже, у вас возникли трудности с подключением из-за проблем с протоколом.
Убедитесь, что у вас стабильное сетевое соединение, затем перейдите в Настройки -> Подключение сканера -> нажмите вкладку "Проверить проблемы с подключением" вверху и проверьте детали.

Кроме того, попробуйте следующее:
1. Увеличьте [Тайм-аут ответа] и [Количество повторных подключений] в приложении в разделе [Настройки] -> [Протокол и данные].
2. В [Тип протокола] попробуйте последовательно менять протоколы, чтобы увидеть, отображаются ли данные корректно. (Пожалуйста, сначала попробуйте номер 6.)

Если у вас есть дополнительные вопросы, ознакомьтесь с "Руководством пользователя" на главной странице приложения.
\n
Спасибо.`,
    'NO_DATA_PROTOCOL': `Здравствуйте, это Infocar.
Приносим извинения за неудобства.
\n
Похоже, что возвращается "NO DATA", так как совместимый протокол не был установлен, что привело к разрыву соединения из-за повторяющихся аномальных ответов.

Пожалуйста, обратитесь к следующему:
1. Увеличьте [Тайм-аут ответа] и [Количество повторных подключений] в приложении в разделе [Настройки] -> [Протокол и данные].
2. В [Тип протокола] попробуйте последовательно менять протоколы, чтобы увидеть, отображаются ли данные корректно. (Пожалуйста, сначала попробуйте номер 6.)

Если данные по-прежнему не появляются, значит, устройство несовместимо с вашим автомобилем.

Если у вас есть дополнительные вопросы, ознакомьтесь с "Руководством пользователя" на главной странице приложения.
\n
Спасибо.`,
    'WIFI_CONNECTION': `Здравствуйте, это Infocar.
Похоже, у вас проблемы с подключением к сканеру Wi-Fi модуля.
Приносим извинения за неудобства.
\n
Для этого подключения попробуйте следующее:
1. Подключитесь к Wi-Fi сканеру в Системных настройках вашего устройства -> Wi-Fi.
2. Затем попытайтесь подключиться, используя правильный IP и порт в приложении Infocar.

Для получения подробной информации обратитесь к разделу Подключение в Руководстве пользователя внутри приложения.
\n
Спасибо.`,
    'HUD_INTERFERENCE': `Здравствуйте, это Infocar.
Прежде всего, приносим извинения за неудобства.
\n
Судя по отправленному вами лог-файлу, вы используете HUD-устройство вместе со сканером.
При одновременном использовании с HUD-устройством сбор данных может быть затруднен из-за конфликта данных между устройствами.
Если вы используете Y-кабель, оба устройства могут запрашивать данные одновременно, из-за чего ЭБУ не сможет отправлять нормальные данные.
Пожалуйста, подключайте к порту OBD только сканер Infocar.
\n
Спасибо.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 16. Spanish
  'ES': {
    'GENERAL_CONNECTION': `Hola, somos Infocar.
Pedimos disculpas por las molestias.
\n
Parece que está experimentando dificultades de conexión debido a problemas de protocolo.
Asegúrese de tener una conexión de red estable, luego vaya a Configuración -> Conexión del escáner -> toque la pestaña "Verificar problemas de conexión" en la parte superior y verifique los detalles.

Además, intente lo siguiente:
1. Aumente el [Tiempo de espera de respuesta] y el [Recuento de reconexiones] en la aplicación en [Configuración] -> [Protocolo y datos].
2. En [Tipo de protocolo], intente cambiar los protocolos secuencialmente para ver si los datos se muestran correctamente. (Por favor, intente el número 6 primero.)

Si tiene más preguntas, consulte la "Guía del usuario" en la página principal de la aplicación.
\n
Gracias.`,
    'NO_DATA_PROTOCOL': `Hola, somos Infocar.
Pedimos disculpas por las molestias.
\n
Parece que se devuelve "NO DATA" porque no se estableció un protocolo compatible, lo que lleva a la terminación de la conexión debido a respuestas anormales repetidas.

Por favor, consulte lo siguiente:
1. Aumente el [Tiempo de espera de respuesta] y el [Recuento de reconexiones] en la aplicación en [Configuración] -> [Protocolo y datos].
2. En [Tipo de protocolo], intente cambiar los protocolos secuencialmente para ver si los datos se muestran correctamente. (Por favor, intente el número 6 primero.)

Si los datos aún no aparecen, se determina que el dispositivo no es compatible con su vehículo.

Si tiene más preguntas, consulte la "Guía del usuario" en la página principal de la aplicación.
\n
Gracias.`,
    'WIFI_CONNECTION': `Hola, somos Infocar.
Parece que tiene problemas para conectarse al escáner del módulo Wi-Fi.
Pedimos disculpas por las molestias.
\n
Para esta conexión, intente lo siguiente:
1. Conéctese al escáner Wi-Fi en la Configuración del sistema de su dispositivo -> Wi-Fi.
2. Luego, intente conectarse usando la IP y el Puerto correctos dentro de la aplicación Infocar.

Para más detalles, consulte la sección Conexión en la Guía del usuario dentro de la aplicación.
\n
Gracias.`,
    'HUD_INTERFERENCE': `Hola, somos Infocar.
Primero, pedimos disculpas por las molestias.
\n
Mirando el archivo de registro que envió, parece que está usando un producto HUD junto con el escáner.
Cuando se usa simultáneamente con un producto HUD, la recopilación de datos puede ser difícil debido a la colisión de datos entre productos.
Si usa un cable en Y, ambos productos pueden solicitar datos simultáneamente, lo que hace que la ECU no envíe datos normales.
Por favor, conecte solo el escáner Infocar al puerto OBD.
\n
Gracias.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 17. Thai
  'TH': {
    'GENERAL_CONNECTION': `สวัสดีครับ นี่คือ Infocar
เราต้องขออภัยในความไม่สะดวก
\n
ดูเหมือนว่าคุณกำลังประสบปัญหาการเชื่อมต่อเนื่องจากปัญหาโปรโตคอล
โปรดตรวจสอบให้แน่ใจว่าคุณมีการเชื่อมต่อเครือข่ายที่เสถียร จากนั้นไปที่ การตั้งค่า -> การเชื่อมต่อสแกนเนอร์ -> แตะแท็บ "ตรวจสอบปัญหาการเชื่อมต่อ" ที่ด้านบนและตรวจสอบรายละเอียด

นอกจากนี้ โปรดลองทำตามขั้นตอนต่อไปนี้:
1. เพิ่ม [หมดเวลาการตอบสนอง] และ [จำนวนการเชื่อมต่อใหม่] ในแอปภายใต้ [การตั้งค่า] -> [โปรโตคอลและข้อมูล]
2. ใน [ประเภทโปรโตคอล] ลองเปลี่ยนโปรโตคอลตามลำดับเพื่อดูว่าข้อมูลแสดงผลถูกต้องหรือไม่ (โปรดลองหมายเลข 6 ก่อน)

หากคุณมีคำถามเพิ่มเติม โปรดตรวจสอบ "คู่มือผู้ใช้" ที่หน้าหลักของแอป
\n
ขอบคุณครับ`,
    'NO_DATA_PROTOCOL': `สวัสดีครับ นี่คือ Infocar
เราต้องขออภัยในความไม่สะดวก
\n
ดูเหมือนว่าจะมีการส่งคืน "NO DATA" เนื่องจากไม่มีการสร้างโปรโตคอลที่เข้ากันได้ ซึ่งนำไปสู่การยุติการเชื่อมต่อเนื่องจากการตอบสนองผิดปกติซ้ำๆ

โปรดอ้างอิงถึงสิ่งต่อไปนี้:
1. เพิ่ม [หมดเวลาการตอบสนอง] และ [จำนวนการเชื่อมต่อใหม่] ในแอปภายใต้ [การตั้งค่า] -> [โปรโตคอลและข้อมูล]
2. ใน [ประเภทโปรโตคอล] ลองเปลี่ยนโปรโตคอลตามลำดับเพื่อดูว่าข้อมูลแสดงผลถูกต้องหรือไม่ (โปรดลองหมายเลข 6 ก่อน)

หากข้อมูลยังคงไม่ปรากฏ แสดงว่าอุปกรณ์ไม่เข้ากันกับยานพาหนะของคุณ

หากคุณมีคำถามเพิ่มเติม โปรดตรวจสอบ "คู่มือผู้ใช้" ที่หน้าหลักของแอป
\n
ขอบคุณครับ`,
    'WIFI_CONNECTION': `สวัสดีครับ นี่คือ Infocar
ดูเหมือนว่าคุณกำลังมีปัญหาในการเชื่อมต่อกับสแกนเนอร์โมดูล Wi-Fi
เราต้องขออภัยในความไม่สะดวก
\n
สำหรับการเชื่อมต่อนี้ โปรดลองทำตามขั้นตอนต่อไปนี้:
1. เชื่อมต่อกับสแกนเนอร์ Wi-Fi ในการตั้งค่าระบบของอุปกรณ์ของคุณ -> Wi-Fi
2. จากนั้น พยายามเชื่อมต่อโดยใช้ IP และพอร์ตที่ถูกต้องภายในแอป Infocar

สำหรับรายละเอียดเพิ่มเติม โปรดดูส่วนการเชื่อมต่อในคู่มือผู้ใช้ภายในแอป
\n
ขอบคุณครับ`,
    'HUD_INTERFERENCE': `สวัสดีครับ นี่คือ Infocar
ก่อนอื่น เราต้องขออภัยในความไม่สะดวก
\n
เมื่อดูจากไฟล์บันทึกที่คุณส่งมา ดูเหมือนว่าคุณกำลังใช้ผลิตภัณฑ์ HUD ร่วมกับสแกนเนอร์
เมื่อใช้พร้อมกับผลิตภัณฑ์ HUD การรวบรวมข้อมูลอาจทำได้ยากเนื่องจากการชนกันของข้อมูลระหว่างผลิตภัณฑ์
หากคุณใช้สายเคเบิล Y ทั้งสองผลิตภัณฑ์อาจร้องขอข้อมูลพร้อมกัน ทำให้ ECU ล้มเหลวในการส่งข้อมูลปกติ
โปรดเชื่อมต่อเฉพาะสแกนเนอร์ Infocar เข้ากับพอร์ต OBD
\n
ขอบคุณครับ`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 18. Turkish
  'TR': {
    'GENERAL_CONNECTION': `Merhaba, ben Infocar.
Yaşanan rahatsızlıktan dolayı özür dileriz.
\n
Protokol sorunları nedeniyle bağlantı zorlukları yaşadığınız görülüyor.
Lütfen sabit bir ağ bağlantınız olduğundan emin olun, ardından Ayarlar -> Tarayıcı Bağlantısı -> üstteki "Bağlantı Sorunlarını Kontrol Et" sekmesine dokunun ve ayrıntıları kontrol edin.

Ek olarak, lütfen şunları deneyin:
1. Uygulamada [Ayarlar] -> [Protokol ve Veri] altında [Yanıt Zaman Aşımı] ve [Yeniden Bağlanma Sayısı] değerlerini artırın.
2. [Protokol Türü] içinde, verilerin doğru görüntülenip görüntülenmediğini görmek için protokolleri sırayla değiştirmeyi deneyin. (Lütfen önce 6 numarayı deneyin.)

Başka sorularınız varsa, lütfen uygulamanın ana sayfasındaki "Kullanıcı Kılavuzu"nu kontrol edin.
\n
Teşekkürler.`,
    'NO_DATA_PROTOCOL': `Merhaba, ben Infocar.
Yaşanan rahatsızlıktan dolayı özür dileriz.
\n
Uyumlu bir protokol oluşturulmadığı için "NO DATA" döndürüldüğü ve tekrarlanan anormal yanıtlar nedeniyle bağlantının sonlandırıldığı görülüyor.

Lütfen aşağıdakilere bakın:
1. Uygulamada [Ayarlar] -> [Protokol ve Veri] altında [Yanıt Zaman Aşımı] ve [Yeniden Bağlanma Sayısı] değerlerini artırın.
2. [Protokol Türü] içinde, verilerin doğru görüntülenip görüntülenmediğini görmek için protokolleri sırayla değiştirmeyi deneyin. (Lütfen önce 6 numarayı deneyin.)

Veriler hala görünmüyorsa, cihazın aracınızla uyumlu olmadığı belirlenir.

Başka sorularınız varsa, lütfen uygulamanın ana sayfasındaki "Kullanıcı Kılavuzu"nu kontrol edin.
\n
Teşekkürler.`,
    'WIFI_CONNECTION': `Merhaba, ben Infocar.
Wi-Fi modülü tarayıcısına bağlanmakta sorun yaşıyorsunuz gibi görünüyor.
Yaşanan rahatsızlıktan dolayı özür dileriz.
\n
Bu bağlantı için lütfen şunları deneyin:
1. Cihazınızın Sistem Ayarları -> Wi-Fi bölümünden Wi-Fi tarayıcısına bağlanın.
2. Ardından, Infocar uygulaması içinde doğru IP ve Bağlantı Noktasını kullanarak bağlanmayı deneyin.

Daha fazla ayrıntı için lütfen uygulama içindeki Kullanıcı Kılavuzundaki Bağlantı bölümüne bakın.
\n
Teşekkürler.`,
    'HUD_INTERFERENCE': `Merhaba, ben Infocar.
Öncelikle yaşanan rahatsızlıktan dolayı özür dileriz.
\n
Gönderdiğiniz günlük dosyasına baktığımızda, tarayıcıyla birlikte bir HUD ürünü kullandığınız görülüyor.
Bir HUD ürünüyle aynı anda kullanıldığında, ürünler arasındaki veri çakışması nedeniyle veri toplama zor olabilir.
Y kablosu kullanırsanız, her iki ürün de aynı anda veri talep edebilir ve bu da ECU'nun normal verileri gönderememesine neden olabilir.
Lütfen OBD portuna sadece Infocar tarayıcısını bağlayın.
\n
Teşekkürler.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 19. Ukrainian
  'UK': {
    'GENERAL_CONNECTION': `Привіт, це Infocar.
Вибачте за незручності.
\n
Схоже, у вас виникли труднощі з підключенням через проблеми з протоколом.
Будь ласка, переконайтеся, що у вас стабільне мережеве з'єднання, потім перейдіть у Налаштування -> Підключення сканера -> натисніть вкладку «Перевірити проблеми підключення» вгорі та перевірте деталі.

Крім того, спробуйте наступне:
1. Збільште [Час очікування відповіді] та [Кількість повторних підключень] у додатку в розділі [Налаштування] -> [Протокол і дані].
2. У [Тип протоколу] спробуйте послідовно змінювати протоколи, щоб побачити, чи дані відображаються коректно. (Будь ласка, спочатку спробуйте номер 6.)

Якщо у вас є додаткові запитання, перегляньте «Посібник користувача» на головній сторінці додатка.
\n
Дякуємо.`,
    'NO_DATA_PROTOCOL': `Привіт, це Infocar.
Вибачте за незручності.
\n
Схоже, що повертається "NO DATA", оскільки сумісний протокол не було встановлено, що призвело до розриву з'єднання через повторювані аномальні відповіді.

Будь ласка, зверніться до наступного:
1. Збільште [Час очікування відповіді] та [Кількість повторних підключень] у додатку в розділі [Налаштування] -> [Протокол і дані].
2. У [Тип протоколу] спробуйте послідовно змінювати протоколи, щоб побачити, чи дані відображаються коректно. (Будь ласка, спочатку спробуйте номер 6.)

Якщо дані все ще не з'являються, це означає, що пристрій несумісний з вашим автомобілем.

Якщо у вас є додаткові запитання, перегляньте «Посібник користувача» на головній сторінці додатка.
\n
Дякуємо.`,
    'WIFI_CONNECTION': `Привіт, це Infocar.
Схоже, у вас проблеми з підключенням до сканера модуля Wi-Fi.
Вибачте за незручності.
\n
Для цього підключення спробуйте наступне:
1. Підключіться до сканера Wi-Fi у Налаштуваннях системи вашого пристрою -> Wi-Fi.
2. Потім спробуйте підключитися, використовуючи правильну IP-адресу та порт у додатку Infocar.

Для отримання детальної інформації зверніться до розділу Підключення в Посібнику користувача всередині додатка.
\n
Дякуємо.`,
    'HUD_INTERFERENCE': `Привіт, це Infocar.
Перш за все, вибачте за незручності.
\n
Дивлячись на файл журналу, який ви надіслали, здається, що ви використовуєте HUD-продукт разом зі сканером.
При одночасному використанні з HUD-продуктом збір даних може бути ускладнений через колізію даних між продуктами.
Якщо ви використовуєте Y-кабель, обидва продукти можуть запитувати дані одночасно, що призводить до того, що ЕБУ не може надсилати нормальні дані.
Будь ласка, підключайте до порту OBD тільки сканер Infocar.
\n
Дякуємо.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 20. Vietnamese
  'VI': {
    'GENERAL_CONNECTION': `Xin chào, đây là Infocar.
Chúng tôi xin lỗi vì sự bất tiện này.
\n
Có vẻ như bạn đang gặp khó khăn khi kết nối do vấn đề về giao thức.
Vui lòng đảm bảo bạn có kết nối mạng ổn định, sau đó vào Cài đặt -> Kết nối máy quét -> nhấn vào tab "Kiểm tra sự cố kết nối" ở trên cùng và kiểm tra chi tiết.

Ngoài ra, vui lòng thử các cách sau:
1. Tăng [Thời gian chờ phản hồi] và [Số lần kết nối lại] trong ứng dụng tại [Cài đặt] -> [Giao thức & Dữ liệu].
2. Trong [Loại giao thức], hãy thử thay đổi các giao thức theo thứ tự để xem dữ liệu có hiển thị chính xác không. (Vui lòng thử số 6 trước.)

Nếu bạn có thêm câu hỏi, vui lòng kiểm tra "Hướng dẫn sử dụng" trên trang chính của ứng dụng.
\n
Cảm ơn bạn.`,
    'NO_DATA_PROTOCOL': `Xin chào, đây là Infocar.
Chúng tôi xin lỗi vì sự bất tiện này.
\n
Có vẻ như "NO DATA" đang được trả về vì giao thức tương thích không được thiết lập, dẫn đến việc ngắt kết nối do phản hồi bất thường lặp lại.

Vui lòng tham khảo các cách sau:
1. Tăng [Thời gian chờ phản hồi] và [Số lần kết nối lại] trong ứng dụng tại [Cài đặt] -> [Giao thức & Dữ liệu].
2. Trong [Loại giao thức], hãy thử thay đổi các giao thức theo thứ tự để xem dữ liệu có hiển thị chính xác không. (Vui lòng thử số 6 trước.)

Nếu dữ liệu vẫn không xuất hiện, thiết bị được xác định là không tương thích với xe của bạn.

Nếu bạn có thêm câu hỏi, vui lòng kiểm tra "Hướng dẫn sử dụng" trên trang chính của ứng dụng.
\n
Cảm ơn bạn.`,
    'WIFI_CONNECTION': `Xin chào, đây là Infocar.
Có vẻ như bạn đang gặp sự cố khi kết nối với máy quét mô-đun Wi-Fi.
Chúng tôi xin lỗi vì sự bất tiện này.
\n
Đối với kết nối này, vui lòng thử các cách sau:
1. Kết nối với máy quét Wi-Fi trong Cài đặt hệ thống của thiết bị -> Wi-Fi.
2. Sau đó, thử kết nối bằng IP và Cổng chính xác trong ứng dụng Infocar.

Để biết thêm chi tiết, vui lòng tham khảo phần Kết nối trong Hướng dẫn sử dụng bên trong ứng dụng.
\n
Cảm ơn bạn.`,
    'HUD_INTERFERENCE': `Xin chào, đây là Infocar.
Trước hết, chúng tôi xin lỗi vì sự bất tiện này.
\n
Nhìn vào tệp nhật ký bạn đã gửi, có vẻ như bạn đang sử dụng sản phẩm HUD cùng với máy quét.
Khi sử dụng đồng thời với sản phẩm HUD, việc thu thập dữ liệu có thể khó khăn do xung đột dữ liệu giữa các sản phẩm.
Nếu bạn sử dụng cáp chữ Y, cả hai sản phẩm có thể yêu cầu dữ liệu cùng lúc, khiến ECU không gửi được dữ liệu bình thường.
Vui lòng chỉ kết nối máy quét Infocar với cổng OBD.
\n
Cảm ơn bạn.`,
    'SUCCESS': '',
    'NONE': ''
  },

  // 21. Arabic
  'AR': {
    'GENERAL_CONNECTION': `مرحبًا، هذه Infocar.
نعتذر عن الإزعاج.
\n
يبدو أنك تواجه صعوبات في الاتصال بسبب مشاكل في البروتوكول.
يرجى التأكد من أن لديك اتصال شبكة مستقر، ثم انتقل إلى الإعدادات -> اتصال الماسح الضوئي -> اضغط على علامة التبويب "التحقق من مشاكل الاتصال" في الأعلى وتحقق من التفاصيل.

بالإضافة إلى ذلك، يرجى تجربة ما يلي:
1. زيادة [مهلة الاستجابة] و [عدد مرات إعادة الاتصال] في التطبيق ضمن [الإعدادات] -> [البروتوكول والبيانات].
2. في [نوع البروتوكول]، حاول تغيير البروتوكولات بالتسلسل لمعرفة ما إذا كانت البيانات تظهر بشكل صحيح. (يرجى تجربة الرقم 6 أولاً.)

إذا كان لديك أي أسئلة أخرى، يرجى التحقق من "دليل المستخدم" في الصفحة الرئيسية للتطبيق.
\n
شكرًا لك.`,
    'NO_DATA_PROTOCOL': `مرحبًا، هذه Infocar.
نعتذر عن الإزعاج.
\n
يبدو أنه يتم إرجاع "NO DATA" لعدم إنشاء بروتوكول متوافق، مما يؤدي إلى إنهاء الاتصال بسبب الاستجابات غير الطبيعية المتكررة.

يرجى الرجوع إلى ما يلي:
1. زيادة [مهلة الاستجابة] و [عدد مرات إعادة الاتصال] في التطبيق ضمن [الإعدادات] -> [البروتوكول والبيانات].
2. في [نوع البروتوكول]، حاول تغيير البروتوكولات بالتسلسل لمعرفة ما إذا كانت البيانات تظهر بشكل صحيح. (يرجى تجربة الرقم 6 أولاً.)

إذا كانت البيانات لا تزال لا تظهر، فسيتم تحديد أن الجهاز غير متوافق مع سيارتك.

إذا كان لديك أي أسئلة أخرى، يرجى التحقق من "دليل المستخدم" في الصفحة الرئيسية للتطبيق.
\n
شكرًا لك.`,
    'WIFI_CONNECTION': `مرحبًا، هذه Infocar.
يبدو أنك تواجه مشكلة في الاتصال بماسح وحدة Wi-Fi.
نعتذر عن الإزعاج.
\n
لهذا الاتصال، يرجى تجربة ما يلي:
1. اتصل بماسح Wi-Fi في إعدادات النظام بجهازك -> Wi-Fi.
2. ثم، حاول الاتصال باستخدام IP والمنفذ الصحيحين داخل تطبيق Infocar.

لمزيد من التفاصيل، يرجى الرجوع إلى قسم الاتصال في دليل المستخدم داخل التطبيق.
\n
شكرًا لك.`,
    'HUD_INTERFERENCE': `مرحبًا، هذه Infocar.
أولاً، نعتذر عن الإزعاج.
\n
بالنظر إلى ملف السجل الذي أرسلته، يبدو أنك تستخدم منتج HUD مع الماسح الضوئي.
عند الاستخدام في وقت واحد مع منتج HUD، قد يكون جمع البيانات صعبًا بسبب تعارض البيانات بين المنتجات.
إذا كنت تستخدم كابل Y، فقد يطلب كلا المنتجين البيانات في وقت واحد، مما يتسبب في فشل وحدة التحكم الإلكترونية (ECU) في إرسال البيانات العادية.
يرجى توصيل ماسح Infocar فقط بمنفذ OBD.
\n
شكرًا لك.`,
    'SUCCESS': '',
    'NONE': ''
  }
};

const getLanguageFromCountry = (countryCode: string | undefined): LanguageCode => {
  if (!countryCode) return 'EN';
  
  const code = countryCode.toUpperCase().trim();
  
  // Direct Matches
  if (['KR', 'KOR', '82'].includes(code)) return 'KO';
  if (['JP', 'JPN', '81'].includes(code)) return 'JA';
  if (['CN', 'CHN', '86'].includes(code)) return 'ZH-CN';
  if (['TW', 'TWN', 'HK', 'HKG', '886', '852'].includes(code)) return 'ZH-TW';
  if (['FR', 'FRA', 'BE', 'BEL', '33'].includes(code)) return 'FR';
  if (['DE', 'DEU', 'AT', 'AUT', 'CH', 'CHE', '49'].includes(code)) return 'DE';
  if (['IN', 'IND', '91'].includes(code)) return 'HI';
  if (['ID', 'IDN', '62'].includes(code)) return 'ID';
  if (['IT', 'ITA', '39'].includes(code)) return 'IT';
  if (['MY', 'MYS', '60'].includes(code)) return 'MS';
  if (['IR', 'IRN', '98'].includes(code)) return 'FA';
  if (['PL', 'POL', '48'].includes(code)) return 'PL';
  if (['PT', 'PRT', 'BR', 'BRA', '351', '55'].includes(code)) return 'PT';
  if (['RU', 'RUS', 'KZ', 'KAZ', '7'].includes(code)) return 'RU';
  if (['ES', 'ESP', 'MX', 'MEX', 'AR', 'ARG', 'CO', 'COL', '34'].includes(code)) return 'ES';
  if (['TH', 'THA', '66'].includes(code)) return 'TH';
  if (['TR', 'TUR', '90'].includes(code)) return 'TR';
  if (['UA', 'UKR', '380'].includes(code)) return 'UK';
  if (['VN', 'VNM', '84'].includes(code)) return 'VI';
  if (['SA', 'SAU', 'AE', 'ARE', 'EG', 'EGY', 'IQ', 'IRQ', 'QA', 'QAT', 'JO', 'JOR', 'KW', 'KWT', 'OM', 'OMN'].includes(code)) return 'AR';
  
  // Default to English for US, GB, CA, AU, etc. and unknown
  return 'EN';
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ diagnosis, metadata }) => {
  const [copied, setCopied] = useState(false);

  // Determine Language Template based on Country Code
  const { csText, languageName, langCode } = useMemo(() => {
    const code = getLanguageFromCountry(metadata.countryCode);
    
    return {
      csText: CS_TEMPLATES[code][diagnosis.csType] || '',
      languageName: LANGUAGE_NAMES[code],
      langCode: code
    };
  }, [metadata.countryCode, diagnosis.csType]);

  const handleCopy = () => {
    if (!csText) return;
    navigator.clipboard.writeText(csText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRTL = langCode === 'AR' || langCode === 'FA';

  return (
    <div className="bg-white rounded-lg border border-slate-200 mb-6 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        
        {/* Left Column: Technical Diagnosis */}
        <div className="p-6">
            <div className="flex items-start gap-4 h-full">
                <div className="mt-1">
                    <Stethoscope className="w-8 h-8 text-slate-400" />
                </div>
                <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                    연결 진단 리포트
                </h3>
                <p className="text-slate-700 font-medium mb-3">{diagnosis.summary}</p>

                {diagnosis.issues.length > 0 ? (
                    <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase">감지된 이슈 사항</p>
                    <ul className="space-y-2">
                        {diagnosis.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start text-sm text-slate-700 gap-2">
                            <span className="mt-2 w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0" />
                            {issue}
                        </li>
                        ))}
                    </ul>
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">
                        특이 사항이 발견되지 않았습니다.
                    </div>
                )}
                </div>
            </div>
        </div>

        {/* Right Column: CS Response Generator */}
        <div className="p-6 bg-slate-50/50">
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-base font-bold text-slate-900">CS 답변 생성기</h3>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-full text-slate-500">
                             <Globe className="w-3 h-3" />
                             <span>{languageName}</span>
                        </div>
                        {csText && (
                            <button 
                                onClick={handleCopy}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm border ${
                                    copied 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-indigo-600'
                                }`}
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? '복사됨' : '복사'}
                            </button>
                        )}
                     </div>
                </div>

                <div className="flex-1">
                    {csText ? (
                         <div 
                            dir="auto"
                            className={`w-full h-full min-h-[160px] bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap overflow-y-auto max-h-[300px] ${isRTL ? 'text-right' : 'text-left'}`}
                         >
                            {csText}
                         </div>
                    ) : (
                        <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                            <p className="text-sm">생성된 답변이 없습니다.</p>
                            <p className="text-xs mt-1">정상 연결 상태이거나 이슈가 특정되지 않았습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
