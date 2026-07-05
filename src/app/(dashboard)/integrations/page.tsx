"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plug, Link2, CheckCircle2, type LucideIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function GranolaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} version="1.1" viewBox="0 0 1308.2438965 1350" xmlns="http://www.w3.org/2000/svg">
      <style>{".st0{fill:#1E1E1E;}"}</style>
      <path
        className="st0"
        d="M1033.7697754,1021.5519409c-21.5993652,24.2390747-40.1063843,38.9168091-50.3071899,45.9337769
	c-4.7957153,3.1881104-7.7962036,7.6500244-11.9937134,11.4755859
	c-22.1997681,19.1352539-46.2614746,24.8300781-63.06073,38.2254639
	c-22.7993164,17.8594971-107.9772339,39.0952148-132.1790771,46.5419922
	c-40.9568481,9.3083496-87.0346069,12.6678467-137.4344482,10.7545166c-10.9053955,0-20.991272-0.0043945-30.2585449-0.7252197
	c-3.7649536-0.2927246-7.5383911,0.675293-11.3141479,0.7230225c-0.1495361,0.0021973-0.2905884,0.0021973-0.4226685,0.0021973
	c-0.4011841,0-1.0690918-0.2862549-2.0055542-0.8564453c-1.0635376-0.6470947-2.2635498-1.0601807-3.5089722-1.0601807
	c-0.3252563,0-0.6525269-0.0292969-0.9745483-0.0726318c-5.079895-0.6959229-7.78125,1.0863037-9.7347412,2.0770264
	c-1.4796143,0.7501221-3.0903931,0.12146-4.4910889-0.7674561c-4.4314575-2.8129883-14.3168945-9.1362305-17.6815796-10.1606445
	c-3.3172607-1.0081787-3.6425171,0.3685303-5.4051514,0.6785889c-1.1813965,0.2081299-2.4096069-0.2070312-3.2974854-1.0124512
	c-0.9940186-0.9008789-2.0576172-2.2006836-4.4989014-3.4992676c-4.4888306-2.3859863-6.8792114,3.0352783-13.5491943-3.0321045
	c-0.9690552-0.8812256-1.5383301-2.6135254-2.845459-2.6959229c-0.3275146-0.0206299-0.5649414-0.0401611-0.8869629-0.1030273
	c-6.7153931-1.3029785-18.9173584-3.7995605-27.1170044-6.2895508c-9.6000977-2.5517578-6.6083069-4.4597168-10.8088074-6.3730469
	c-56.3989868-21.0496826-136.7931519-62.5150146-166.1929932-91.8565674
	c-10.7991943-10.8436279-23.3979187-35.7210083-31.1984558-42.1016846
	c-6.0003052-5.1036377-18.0027161-15.3076172-21.0029907-20.4100952c-2.3995667-4.46521-0.0043335-12.7537231-4.2025452-18.4946899
	c-5.4000549-7.0169678-16.20224-10.8468628-26.4021149-26.7940674
	c-11.3994293-17.859436-17.9988098-41.4598999-29.3980103-65.6978149
	C201.9965973,854.911499,175.0002289,786.0202026,175,660.3612671c0-84.1989746,38.999939-200.9341125,55.8001099-216.8802185
	c10.7962036-10.2072754,9.5955048-32.528595,17.3930664-43.3721619
	c89.0116882-123.7463379,244.8043213-214.7861938,430.2043457-224.3546295
	c7.5328979-0.3865662,15.072876-0.6276245,22.6151733-0.7156677c45.7410278-0.5339661,91.583374,4.4694061,136.0370483,15.3110352
	c44.4141846,10.8320007,86.8728638,27.7349396,128.2607422,46.9507446c0,0,4.9141846,0.3894501,6.2098389,1.025589
	c2.1591797,1.0615234,3.0708008,2.9949188,5.2293091,4.0579529c2.1591797,1.0615234,5.2803345,0.1610107,7.638855,0.6438293
	c7.774292,1.5916138,9.1699829,6.2081909,10.6022949,8.0475006c1.7391968,2.2333527,3.8304443,3.0867004,7.7841187,4.2215271
	c10.3123169,2.9599457,11.6682129,6.3678436,13.0709839,7.9369965c1.119751,1.2547913,1.607605,2.8812866,2.1669922,4.3390503
	c0.567688,1.4821777,1.6954956,2.8354187,3.2773438,3.2061462c3.4158325,0.8006287,8.0632935,4.9833679,9.0244751,10.689209
	c0.626709,3.7198792,4.6495361,5.3226929,3.550293,12.3006287c-0.3560791,2.2603149,2.0496826,5.6016541-10.5968628,18.0704041
	s-39.1845703,20.3282166-55.3406982,14.1350403c-55.8503418-21.4093018-64.1322632-25.5296631-86.5679932-31.6485291
	c-40.9569092-11.1700439-75.8527832-18.759491-118.357605-17.9596558
	c-67.8004761,1.2758789-121.2071533,7.6550598-185.40625,29.9805298
	c-28.1415405,9.9719849-81.2704468,37.1080322-107.9295349,58.2385254
	c-26.6590576,21.1304932-65.2558594,50.3164368-81.1852112,77.333252
	c-5.5780029,9.4605408-11.855896,18.4968567-25.0551147,33.1670837
	c-19.1992798,21.0486755-41.4223938,81.9349976-48.6236267,111.2775879
	c-1.8004761,6.378479,2.9920044,13.3964844,0.5931396,19.776062c-2.4002686,7.0158081-13.8008423,10.2126465-15.0008545,15.9525757
	c-4.7991028,20.4112549-3.5990906,46.5614014-3.5990906,68.8848267c0,12.1184082,3.6023254,28.7008667,7.8019104,38.2695923
	c2.9993286,6.378479,12.6040039,10.8457642,13.8040161,17.2242432c0.5993347,4.4628906-5.393158,9.5643921-5.3984375,13.3910522
	c0,3.18927,5.394104,46.5743408,8.3945923,52.9528198c4.2018738,7.6532593,17.4031372,17.21875,21.0031738,26.1479492
	c2.3988953,6.378418-4.2071533,12.7611694,0.5928955,19.1396484c2.9995728,3.8277588,12.6074829,3.8223267,16.2075195,8.9248047
	c4.7988892,6.3773804,14.9953308,24.8699341,19.7965393,30.6152954c3.6000366,4.46521,10.2007751,6.3861084,13.2003479,8.2993774
	c8.997345,6.378479,1.2043762,12.1140747,9.6021729,21.6806641c26.3995667,29.9800415,67.201355,66.9834595,106.2017517,83.5680542
	c6.0163574,2.557251,67.7541504,26.1316528,71.3931885,26.1478882
	c86.9951172,12.8286133,184.8383179,11.6269531,269.4393921-35.5750732
	c19.8032227-10.8468628,131.9692383-88.8079224,150.5701294-181.2953491
	c4.199585-18.4979858,9.5991821-63.1557007,7.1991577-81.0162354
	c-9.6012573-66.338501-50.4778442-161.756897-125.4051514-197.0944824
	c-39.9141846-18.8244629-70.1998291-18.5001221-77.9994507-17.2241821
	c-22.7984009,4.4640503-30.5991821-8.9313354-51.5977783-7.019104
	c-64.199707,5.1035767-127.1983032,22.9663086-176.3981323,74.6334229
	c-45.0004272,47.8394775-54.0087891,109.0753784-31.208313,147.9856567
	c2.4000244,5.1025391,1.2000122,11.4831543-3.6000366,14.6723633c-2.0986328,1.2759399-4.0477295,2.8704834-4.9475098,4.5453491
	c-1.7897339,3.3290405,3.3853149,5.1079712,6.9530029,6.3568115c24.9576416,8.7318726,33.9572754,50.8421631,66.9963379,49.0578003
	h7.197998c0,0,13.8040771-0.0042725,19.2036743-6.3827515c4.4381104-5.2423706,4.4185791-11.3465576,1.2727051-14.0631104
	c-1.402771-1.2108765-3.1762085-1.93396-3.5881348-3.7410278c-0.453186-1.9924316-0.6798096-4.6146851-0.6807251-5.7930298
	c0-1.2758789,1.8004761-1.9208984,1.8004761-3.1968384c-0.0032349-3.8255615-4.199585-7.0148315-3.6000366-10.840332
	c0.3848877-2.0368652,3.2131348-4.854248,5.2076416-6.9572754c1.515625-1.5979004,1.5371704-3.633667,0.5454102-5.6001587
	c-0.0357666-0.0704956-0.0715942-0.1419678-0.1064453-0.2146606c-0.9614868-1.973999-1.1403809-4.317688-0.4866943-6.4130859
	c0.3761597-1.2044067,0.8314209-2.4910889,0.8325806-3.7767944c0.5995483-5.7399292-1.7919922-8.2928467-2.3924561-12.7558594
	c0-1.5761108,8.5443726-5.3193359,11.559082-7.65979c0.8889771-0.6893921,0.9841919-1.8438721,0.6906128-2.9300537
	c-0.6234131-2.3154907-1.4516602-3.0331421-1.4516602-7.2695923c0-1.0189209,0.8607788-2.444458,1.8949585-3.7886353
	c2.0835571-2.710083,4.000061-5.5979614,4.940918-8.8847656l1.6586914-5.7875977
	c0.692688-2.4196167,2.5321655-4.3448486,4.9182129-5.1459351c4.1344604-1.3908081,2.2167358-8.130249,6.1550903-10.0077515
	c1.145874-0.5463867,4.0239258,0.1473999,8.6333618-0.8325806c9.5946045-1.913269,2.9984131-5.1036377,4.7956543-10.2050781
	c0.8390503-3.1242065,3.4406738-2.8141479,5.9555664-2.5648193c2.0162964,0.2005615,3.9796753-0.4606934,5.4301147-1.8753662
	c1.4275513-1.3908081,2.8681641-3.0212402,4.8108521-3.8494263c2.4325562-1.0341187,8.8131714-1.2336426,13.3790283-1.2715454
	c1.8786621-0.0162354,3.7443237-0.2851562,5.6099243-0.505127c5.0961304-0.5994873,12.3264771-0.2439575,15.819397-0.7740479
	c4.1973267-0.6395874,6.5961914-4.4662476,10.1941528-4.4672852c3.0007324,0,7.2055664,5.102478,10.2051392,5.102478
	c2.9995728-0.0021362,5.9989014-2.5517578,8.9984741-2.5517578c1.7995605,0.0010986,2.4000244,3.1859741,5.3984985,3.1870728
	h1.1967773c0,0,27.6039429,0.6352539,56.4033203,18.4936523c19.7999878,12.1194458,34.2044678,41.4663086,34.2044678,41.4663086
	c13.7987671,23.6005249-1.5100708,47.8635864-1.5100708,69.5507812c0,8.9302368,2.9960938,16.5846558,1.1967773,24.8774414
	c-1.2011719,6.3773804-6.0023804,11.4852905-7.8030396,16.5889893c-1.7973022,4.4640503-1.7949829,10.2061157-7.7909546,18.4935913
	c-4.8000488,7.0158081-7.2055664,7.0136719-8.4055786,8.2896118c-1.8004761,1.913269-17.3364258,25.4072266-27.5360718,34.338562
	c-27,24.2389526-51.9569092,31.3372803-88.5570679,31.9746704c-16.1987915,0.6384277-17.9992676,3.8320923-20.399292,3.8320923
	c-8.4012451,0.6373901-46.7924194-1.2727051-58.7957764-3.1860352c0,0-53.3973389-10.2051392-74.4005127-20.4102173
	c-11.3996582-5.1035767-86.4050293-60.6016846-103.2052002-91.857666
	c-52.200531-98.2316895-40.1960449-202.8430176,13.8040466-273.0081177
	c39.0001831-51.0297852,103.1976013-117.3682556,255.5943298-130.1272583
	c77.4008179-6.3784485,146.4083862,3.8309326,200.4093628,29.3458252
	c76.1978149,35.7210693,131.9972534,98.868103,166.796936,173.498291
	C1154.8005371,743.2822266,1151.369751,887.5991211,1033.7697754,1021.5519409z"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 268.1522 273.8827" overflow="hidden" xmlSpace="preserve">
      <defs>
        <linearGradient id="a">
          <stop offset="0" stopColor="#0fbc5c" />
          <stop offset="1" stopColor="#0cba65" />
        </linearGradient>
        <linearGradient id="g">
          <stop offset=".2312727" stopColor="#0fbc5f" />
          <stop offset=".3115468" stopColor="#0fbc5f" />
          <stop offset=".3660131" stopColor="#0fbc5e" />
          <stop offset=".4575163" stopColor="#0fbc5d" />
          <stop offset=".540305" stopColor="#12bc58" />
          <stop offset=".6993464" stopColor="#28bf3c" />
          <stop offset=".7712418" stopColor="#38c02b" />
          <stop offset=".8605665" stopColor="#52c218" />
          <stop offset=".9150327" stopColor="#67c30f" />
          <stop offset="1" stopColor="#86c504" />
        </linearGradient>
        <linearGradient id="h">
          <stop offset=".1416122" stopColor="#1abd4d" />
          <stop offset=".2475151" stopColor="#6ec30d" />
          <stop offset=".3115468" stopColor="#8ac502" />
          <stop offset=".3660131" stopColor="#a2c600" />
          <stop offset=".4456735" stopColor="#c8c903" />
          <stop offset=".540305" stopColor="#ebcb03" />
          <stop offset=".6156363" stopColor="#f7cd07" />
          <stop offset=".6993454" stopColor="#fdcd04" />
          <stop offset=".7712418" stopColor="#fdce05" />
          <stop offset=".8605661" stopColor="#ffce0a" />
        </linearGradient>
        <linearGradient id="f">
          <stop offset=".3159041" stopColor="#ff4c3c" />
          <stop offset=".6038179" stopColor="#ff692c" />
          <stop offset=".7268366" stopColor="#ff7825" />
          <stop offset=".884534" stopColor="#ff8d1b" />
          <stop offset="1" stopColor="#ff9f13" />
        </linearGradient>
        <linearGradient id="b">
          <stop offset=".2312727" stopColor="#ff4541" />
          <stop offset=".3115468" stopColor="#ff4540" />
          <stop offset=".4575163" stopColor="#ff4640" />
          <stop offset=".540305" stopColor="#ff473f" />
          <stop offset=".6993464" stopColor="#ff5138" />
          <stop offset=".7712418" stopColor="#ff5b33" />
          <stop offset=".8605665" stopColor="#ff6c29" />
          <stop offset="1" stopColor="#ff8c18" />
        </linearGradient>
        <linearGradient id="d">
          <stop offset=".4084578" stopColor="#fb4e5a" />
          <stop offset="1" stopColor="#ff4540" />
        </linearGradient>
        <linearGradient id="c">
          <stop offset=".1315461" stopColor="#0cba65" />
          <stop offset=".2097843" stopColor="#0bb86d" />
          <stop offset=".2972969" stopColor="#09b479" />
          <stop offset=".3962575" stopColor="#08ad93" />
          <stop offset=".4771242" stopColor="#0aa6a9" />
          <stop offset=".5684245" stopColor="#0d9cc6" />
          <stop offset=".667385" stopColor="#1893dd" />
          <stop offset=".7687273" stopColor="#258bf1" />
          <stop offset=".8585063" stopColor="#3086ff" />
        </linearGradient>
        <linearGradient id="e">
          <stop offset=".3660131" stopColor="#ff4e3a" />
          <stop offset=".4575163" stopColor="#ff8a1b" />
          <stop offset=".540305" stopColor="#ffa312" />
          <stop offset=".6156363" stopColor="#ffb60c" />
          <stop offset=".7712418" stopColor="#ffcd0a" />
          <stop offset=".8605665" stopColor="#fecf0a" />
          <stop offset=".9150327" stopColor="#fecf08" />
          <stop offset="1" stopColor="#fdcd01" />
        </linearGradient>
        <linearGradient xlinkHref="#a" id="s" x1="219.6997" y1="329.5351" x2="254.4673" y2="329.5351" gradientUnits="userSpaceOnUse" />
        <radialGradient xlinkHref="#b" id="m" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1.936885,1.043001,1.455731,2.555422,290.5254,-400.6338)" cx="109.6267" cy="135.8619" fx="109.6267" fy="135.8619" r="71.46001" />
        <radialGradient xlinkHref="#c" id="n" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-3.512595,-4.45809,-1.692547,1.260616,870.8006,191.554)" cx="45.25866" cy="279.2738" fx="45.25866" fy="279.2738" r="71.46001" />
        <radialGradient xlinkHref="#d" id="l" cx="304.0166" cy="118.0089" fx="304.0166" fy="118.0089" r="47.85445" gradientTransform="matrix(2.064353,-4.926832e-6,-2.901531e-6,2.592041,-297.6788,-151.7469)" gradientUnits="userSpaceOnUse" />
        <radialGradient xlinkHref="#e" id="o" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.2485783,2.083138,2.962486,0.3341668,-255.1463,-331.1636)" cx="181.001" cy="177.2013" fx="181.001" fy="177.2013" r="71.46001" />
        <radialGradient xlinkHref="#f" id="p" cx="207.6733" cy="108.0972" fx="207.6733" fy="108.0972" r="41.1025" gradientTransform="matrix(-1.249206,1.343263,-3.896837,-3.425693,880.5011,194.9051)" gradientUnits="userSpaceOnUse" />
        <radialGradient xlinkHref="#g" id="r" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1.936885,-1.043001,1.455731,-2.555422,290.5254,838.6834)" cx="109.6267" cy="135.8619" fx="109.6267" fy="135.8619" r="71.46001" />
        <radialGradient xlinkHref="#h" id="j" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.081402,-1.93722,2.926737,-0.1162508,-215.1345,632.8606)" cx="154.8697" cy="145.9691" fx="154.8697" fy="145.9691" r="71.46001" />
        <filter id="q" x="-.04842873" y="-.0582241" width="1.096857" height="1.116448" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="1.700914" />
        </filter>
        <filter id="k" x="-.01670084" y="-.01009856" width="1.033402" height="1.020197" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation=".2419367" />
        </filter>
        <clipPath clipPathUnits="userSpaceOnUse" id="i">
          <path d="M371.3784 193.2406H237.0825v53.4375h77.167c-1.2405 7.5627-4.0259 15.0024-8.1049 21.7862-4.6734 7.7723-10.4511 13.6895-16.373 18.1957-17.7389 13.4983-38.42 16.2584-52.7828 16.2584-36.2824 0-67.2833-23.2865-79.2844-54.9287-.4843-1.1482-.8059-2.3344-1.1975-3.5068-2.652-8.0533-4.101-16.5825-4.101-25.4474 0-9.226 1.5691-18.0575 4.4301-26.3985 11.2851-32.8967 42.9849-57.4674 80.1789-57.4674 7.4811 0 14.6854.8843 21.5173 2.6481 15.6135 4.0309 26.6578 11.9698 33.4252 18.2494l40.834-39.7111c-24.839-22.616-57.2194-36.3201-95.8444-36.3201-30.8782-.00066-59.3863 9.55308-82.7477 25.6992-18.9454 13.0941-34.4833 30.6254-44.9695 50.9861-9.75366 18.8785-15.09441 39.7994-15.09441 62.2934 0 22.495 5.34891 43.6334 15.10261 62.3374v.126c10.3023 19.8567 25.3678 36.9537 43.6783 49.9878 15.9962 11.3866 44.6789 26.5516 84.0307 26.5516 22.6301 0 42.6867-4.0517 60.3748-11.6447 12.76-5.4775 24.0655-12.6217 34.3012-21.8036 13.5247-12.1323 24.1168-27.1388 31.3465-44.4041 7.2297-17.2654 11.097-36.7895 11.097-57.957 0-9.858-.9971-19.8694-2.6881-28.9684Z" fill="#000" />
        </clipPath>
      </defs>
      <g transform="matrix(0.957922,0,0,0.985255,-90.17436,-78.85577)">
        <g clipPath="url(#i)">
          <path d="M92.07563 219.9585c.14844 22.14 6.5014 44.983 16.11767 63.4234v.1269c6.9482 13.3919 16.4444 23.9704 27.2604 34.4518l65.326-23.67c-12.3593-6.2344-14.2452-10.0546-23.1048-17.0253-9.0537-9.0658-15.8015-19.4735-20.0038-31.677h-.1693l.1693-.1269c-2.7646-8.0587-3.0373-16.6129-3.1393-25.5029Z" fill="url(#j)" filter="url(#k)" />
          <path d="M237.0835 79.02491c-6.4568 22.52569-3.988 44.42139 0 57.16129 7.4561.0055 14.6388.8881 21.4494 2.6464 15.6135 4.0309 26.6566 11.97 33.424 18.2496l41.8794-40.7256c-24.8094-22.58904-54.6663-37.2961-96.7528-37.33169Z" fill="url(#l)" filter="url(#k)" />
          <path d="M236.9434 78.84678c-31.6709-.00068-60.9107 9.79833-84.8718 26.35902-8.8968 6.149-17.0612 13.2521-24.3311 21.1509-1.9045 17.7429 14.2569 39.5507 46.2615 39.3702 15.5284-17.9373 38.4946-29.5427 64.0561-29.5427.0233 0 .046.0019.0693.002l-1.0439-57.33536c-.0472-.00003-.0929-.00406-.1401-.00406Z" fill="url(#m)" filter="url(#k)" />
          <path d="m341.4751 226.3788-28.2685 19.2848c-1.2405 7.5627-4.0278 15.0023-8.1068 21.7861-4.6734 7.7723-10.4506 13.6898-16.3725 18.196-17.7022 13.4704-38.3286 16.2439-52.6877 16.2553-14.8415 25.1018-17.4435 37.6749 1.0439 57.9342 22.8762-.0167 43.157-4.1174 61.0458-11.7965 12.9312-5.551 24.3879-12.7913 34.7609-22.0964 13.7061-12.295 24.4421-27.5034 31.7688-45.0003 7.3267-17.497 11.2446-37.2822 11.2446-58.7336Z" fill="url(#n)" filter="url(#k)" />
          <path d="M234.9956 191.2104v57.4981h136.0062c1.1962-7.8745 5.1523-18.0644 5.1523-26.5001 0-9.858-.9963-21.899-2.6873-30.998Z" fill="#3086ff" filter="url(#k)" />
          <path d="M128.3894 124.3268c-8.393 9.1191-15.5632 19.326-21.2483 30.3646-9.75351 18.8785-15.09402 41.8295-15.09402 64.3235 0 .317.02642.6271.02855.9436 4.31953 8.2244 59.66647 6.6495 62.45617 0-.0035-.3103-.0387-.6128-.0387-.9238 0-9.226 1.5696-16.0262 4.4306-24.3672 3.5294-10.2885 9.0557-19.7628 16.1223-27.9257 1.6019-2.0309 5.8748-6.3969 7.1214-9.0157.4749-.9975-.8621-1.5574-.9369-1.9085-.0836-.3927-1.8762-.0769-2.2778-.3694-1.2751-.9288-3.8001-1.4138-5.3334-1.8449-3.2772-.9215-8.7085-2.9536-11.7252-5.0601-9.5357-6.6586-24.417-14.6122-33.5047-24.2164Z" fill="url(#o)" filter="url(#k)" />
          <path d="M162.0989 155.8569c22.1123 13.3013 28.4714-6.7139 43.173-12.9771L179.698 90.21568c-9.4075 3.92642-18.2957 8.80465-26.5426 14.50442-12.316 8.5122-23.192 18.8995-32.1763 30.7204Z" fill="url(#p)" filter="url(#q)" />
          <path d="M171.0987 290.222c-29.6829 10.6413-34.3299 11.023-37.0622 29.2903 5.2213 5.0597 10.8312 9.74 16.7926 13.9835 15.9962 11.3867 46.766 26.5517 86.1178 26.5517.0462 0 .0904-.004.1366-.004v-59.1574c-.0298.0001-.064.002-.0938.002-14.7359 0-26.5113-3.8435-38.5848-10.5273-2.9768-1.6479-8.3775 2.7772-11.1229.799-3.7865-2.7284-12.8991 2.3508-16.1833-.9378Z" fill="url(#r)" filter="url(#k)" />
          <path d="M219.6997 299.0227v59.9959c5.506.6402 11.2361 1.0289 17.2472 1.0289 6.0259 0 11.8556-.3073 17.5204-.8723v-59.7481c-6.3482 1.0777-12.3272 1.461-17.4776 1.461-5.9318 0-11.7005-.6858-17.29-1.8654Z" opacity=".5" fill="url(#s)" filter="url(#k)" />
        </g>
      </g>
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} enableBackground="new 0 0 2499.6 2500" viewBox="0 0 2499.6 2500" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <path d="m1187.9 1187.9h-1187.9v-1187.9h1187.9z" fill="#f1511b" />
      <path d="m2499.6 1187.9h-1188v-1187.9h1187.9v1187.9z" fill="#80cc28" />
      <path d="m1187.9 2500h-1187.9v-1187.9h1187.9z" fill="#00adef" />
      <path d="m2499.6 2500h-1188v-1187.9h1187.9v1187.9z" fill="#fbbc09" />
    </svg>
  );
}

function HubSpotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="22" height="26" viewBox="0 0 22 26" fill="none">
      <g clipPath="url(#hubspot-clip)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.7903 6.70348V9.37375H16.7861C19.2319 9.74741 21.1857 11.5833 21.6869 13.9788C22.1881 16.3743 21.1313 18.8255 19.0361 20.1274C16.9409 21.4293 14.2479 21.308 12.2811 19.8232L10.082 21.9968C10.1389 22.1732 10.1692 22.3569 10.1718 22.542C10.1718 23.5954 9.30785 24.4493 8.24211 24.4493C7.17637 24.4493 6.31241 23.5954 6.31241 22.542C6.31241 21.4886 7.17637 20.6346 8.24211 20.6346C8.42937 20.6373 8.6152 20.6672 8.79365 20.7234L11.0167 18.5262C9.61509 16.5553 9.57888 13.9368 10.9254 11.9289L3.62067 6.30814C2.64054 6.8642 1.39957 6.65902 0.655894 5.81796C-0.087788 4.9769 -0.127341 3.73389 0.561399 2.8483C1.25014 1.96271 2.47561 1.68086 3.48915 2.17493C4.50268 2.66901 5.02239 3.80159 4.73077 4.88077L12.1604 10.6C12.9709 9.95579 13.9392 9.53468 14.9673 9.3793V6.70348C14.2374 6.36653 13.7695 5.64372 13.7659 4.84747V4.78505C13.769 3.65019 14.699 2.73096 15.8472 2.72791H15.9104C17.0585 2.73096 17.9885 3.65019 17.9916 4.78505V4.84747C17.9881 5.64372 17.5202 6.36653 16.7903 6.70348ZM12.8396 15.1587C12.8368 16.8188 14.1956 18.1672 15.8752 18.1711L15.8822 18.1725C17.5626 18.1725 18.9248 16.826 18.9248 15.1651C18.9256 13.5049 17.5652 12.1582 15.8855 12.1564C14.2059 12.1546 12.8425 13.4985 12.8396 15.1587Z"
          fill="#FF4800"
        />
      </g>
      <defs>
        <clipPath id="hubspot-clip">
          <rect width="21.8584" height="26" fill="white" transform="translate(0.0703125)" />
        </clipPath>
      </defs>
    </svg>
  );
}

function SalesforceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 272.164 191.5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M113.258 21.277c8.777-9.144 20.998-14.818 34.513-14.818 17.965 0 33.641 10.018 41.986 24.892a58 58 0 0 1 23.733-5.046c32.404 0 58.674 26.499 58.674 59.189s-26.27 59.19-58.674 59.19c-3.957 0-7.821-.398-11.559-1.152-7.349 13.109-21.359 21.968-37.435 21.968a42.668 42.668 0 0 1-18.765-4.319C138.281 178.71 120.917 191 100.686 191c-21.073 0-39.033-13.332-45.922-32.03a45.117 45.117 0 0 1-9.338.972C20.337 159.942 0 139.392 0 114.043c0-16.99 9.136-31.823 22.715-39.758a52.55 52.55 0 0 1-4.349-20.994C18.366 24.136 42.033.5 71.227.5c17.14 0 32.373 8.148 42.031 20.777"
        fill="#00A1E0"
      />
    </svg>
  );
}

type IconComponent = LucideIcon | React.ComponentType<{ className?: string }>;

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: IconComponent;
  iconBg: string;
  iconColor: string;
  connected: boolean;
  comingSoon?: boolean;
  href?: string;
  actionLabel?: string;
}

function ConnectorCard({ connector }: { connector: Connector }) {
  const Icon = connector.icon;
  return (
    <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className={`w-11 h-11 rounded-xl ${connector.iconBg} flex items-center justify-center ${connector.iconColor} shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          {connector.connected && !connector.comingSoon && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </span>
          )}
          {connector.comingSoon && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
              Coming soon
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm mt-4">{connector.name}</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed flex-1">{connector.description}</p>
        {connector.href && !connector.comingSoon && (
          <Link href={connector.href} className="block mt-5">
            <Button className="rounded-xl gap-2 w-full" size="sm">
              <ArrowRight className="w-3.5 h-3.5" />
              {connector.actionLabel || "View details"}
            </Button>
          </Link>
        )}
        {!connector.href && (
          <Button
            disabled={connector.comingSoon}
            variant={connector.comingSoon ? "outline" : "default"}
            className="rounded-xl gap-2 mt-5 w-full"
            size="sm"
          >
            <Plug className="w-3.5 h-3.5" />
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const [granolaConnected, setGranolaConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkGranola() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      const orgId = profile?.organization_id;
      if (!orgId) {
        setLoading(false);
        return;
      }
      const { count } = await supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      setGranolaConnected((count ?? 0) > 0);
      setLoading(false);
    }
    checkGranola();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <PageHeaderLogo />
        <h1 className="text-2xl font-bold tracking-tight">Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your meeting and CRM tools to import real sales calls.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ConnectorCard
          connector={{
            id: "granola",
            name: "Granola",
            description: "Import meeting transcripts and summaries from your Granola workspace.",
            icon: GranolaIcon,
            iconBg: "bg-[#B2C248]/20",
            iconColor: "text-[#1E1E1E]",
            connected: !loading && granolaConnected,
            href: "/integrations/granola",
            actionLabel: granolaConnected ? "Manage calls" : "Connect",
          }}
        />
        <ConnectorCard
          connector={{
            id: "google",
            name: "Google Calendar & Meet",
            description: "Auto-import calls from Google Calendar and Google Meet recordings.",
            icon: GoogleIcon,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            connected: false,
            comingSoon: true,
          }}
        />
        <ConnectorCard
          connector={{
            id: "microsoft",
            name: "Microsoft Outlook & Teams",
            description: "Sync meetings and transcripts from Outlook Calendar and Teams.",
            icon: MicrosoftIcon,
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
            connected: false,
            comingSoon: true,
          }}
        />
        <ConnectorCard
          connector={{
            id: "hubspot",
            name: "HubSpot",
            description: "Connect deals, contacts, and call activities from HubSpot.",
            icon: HubSpotIcon,
            iconBg: "bg-orange-50",
            iconColor: "text-orange-600",
            connected: false,
            comingSoon: true,
          }}
        />
        <ConnectorCard
          connector={{
            id: "salesforce",
            name: "Salesforce",
            description: "Pull opportunities, accounts, and call logs from Salesforce.",
            icon: SalesforceIcon,
            iconBg: "bg-sky-50",
            iconColor: "text-sky-600",
            connected: false,
            comingSoon: true,
          }}
        />
        <ConnectorCard
          connector={{
            id: "crm",
            name: "Other CRM",
            description: "Connect other product and CRM tools to enrich your call data.",
            icon: Link2,
            iconBg: "bg-slate-100",
            iconColor: "text-slate-600",
            connected: false,
            comingSoon: true,
          }}
        />
      </div>
    </div>
  );
}
