import urllib.request
a=[0,1,2]
for i in range(10,60):
    if i%10>=1 and i%10<=7:
        a.append(i)
for i in a:
    urllib.request.urlretrieve("https://teatube.cn/ttt/img/b{}.png".format(i), "b{}.png".format(i))