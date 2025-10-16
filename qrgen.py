import qrcode

url = "http://172.20.10.2:5000"  # replace with your IP
img = qrcode.make(url)
img.show()
img.save("qr.png")