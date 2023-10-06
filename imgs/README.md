## gif 作成方法

```bash
ffmpeg -i input.mov -filter_complex "[0:v] fps=10,scale=640:-1,split [a][b];[a] palettegen [p];[b][p] paletteuse" output.gif
```

- [参考](https://qiita.com/yusuga/items/ba7b5c2cac3f2928f040)
