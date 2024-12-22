import pptxgen from 'pptxgenjs';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ImageData {
  src: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  isBackground?: boolean;
  isSvg?: boolean;
}

export interface SlideContent {
  type: 'title' | 'content';
  title?: string;
  content?: string[];
  table?: TableData;
  image?: ImageData;
  backgroundImage?: string;
  textColor?: string;
}

const DEFAULT_IMAGE_SIZE = { width: 2, height: 2 };

export class PresentationConverter {
  private pres: pptxgen;

  constructor() {
    this.pres = new pptxgen();
  }

  /**
   * 背景画像を追加
   */
  private async addBackgroundImage(slide: pptxgen.Slide, imageUrl: string) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          slide.background = { data: base64 };
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to load background image:', error);
    }
  }

  /**
   * タイトルスライドの作成
   */
  private async createTitleSlide(content: SlideContent) {
    const slide = this.pres.addSlide();

    if (content.backgroundImage) {
      await this.addBackgroundImage(slide, content.backgroundImage);
    }

    if (content.title) {
      slide.addText(content.title, {
        x: 1,
        y: 2,
        w: '80%',
        h: 1,
        fontSize: 44,
        color: content.textColor || '363636',
        align: 'center',
        bold: true,
      });
    }

    if (content.content && content.content.length > 0) {
      slide.addText(content.content[0], {
        x: 1,
        y: 3.2,
        w: '80%',
        h: 0.5,
        fontSize: 24,
        color: content.textColor || '666666',
        align: 'center',
      });
    }
  }

  /**
   * スライドにテーブルを追加
   */
  private addTableToSlide(
    slide: pptxgen.Slide,
    tableData: TableData,
    yPosition: number,
    textColor: string = '363636'
  ) {
    const tableRows = [
      tableData.headers.map((header) => ({
        text: header,
        options: { bold: true, fill: { color: 'F5F5F5' }, color: textColor },
      })),
      ...tableData.rows.map((row) =>
        row.map((cell) => ({
          text: cell,
          options: { color: textColor },
        }))
      ),
    ];

    slide.addTable(tableRows, {
      x: 0.7,
      y: yPosition,
      w: '85%',
      border: { type: 'solid', color: 'CCCCCC', pt: 1 },
      color: textColor,
      fontSize: 16,
    });
  }

  /**
   * スライドに画像を追加
   */
  private async addImageToSlide(
    slide: pptxgen.Slide,
    imageData: ImageData,
    yPosition: number
  ) {
    try {
      const response = await fetch(imageData.src);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          if (imageData.isBackground) {
            slide.background = { data: base64 };
          } else {
            slide.addImage({
              data: base64,
              x: imageData.x ?? 0.7,
              y: imageData.y ?? yPosition,
              w: imageData.width ?? DEFAULT_IMAGE_SIZE.width,
              h: imageData.height ?? DEFAULT_IMAGE_SIZE.height,
            });
          }
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }

  /**
   * コンテンツスライドの作成
   */
  private async createContentSlide(content: SlideContent) {
    const slide = this.pres.addSlide();
    let currentY = 1.5;

    // 背景画像の処理
    if (content.backgroundImage) {
      await this.addBackgroundImage(slide, content.backgroundImage);
    }

    if (content.title) {
      slide.addText(content.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 0.8,
        fontSize: 32,
        color: content.textColor || '363636',
        bold: true,
      });
    }

    if (content.content) {
      for (const [index, point] of content.content.entries()) {
        const isCode = point.startsWith('[Code]');
        if (isCode) {
          // コードブロックの特別な処理
          const code = point.replace('[Code]', '').trim();
          slide.addText(code, {
            x: 0.7,
            y: currentY + index * 0.7,
            w: '85%',
            h: '45%',
            fontSize: 16,
            color: content.textColor || '363636',
            fontFace: 'Courier New',
            fill: { color: 'F5F5F5' },
            line: { color: 'CCCCCC', width: 1 },
          });
        } else {
          // 通常のテキスト
          slide.addText(point, {
            x: 0.7,
            y: currentY + index * 0.7,
            w: '85%',
            h: 0.5,
            fontSize: 24,
            color: content.textColor || '363636',
            bullet: true,
          });
        }
      }
      currentY += content.content.length * 0.7;
    }

    // テーブルの処理
    if (content.table) {
      this.addTableToSlide(slide, content.table, currentY, content.textColor);
    }

    // 画像の処理
    if (content.image) {
      await this.addImageToSlide(slide, content.image, currentY);
    }
  }

  /**
   * RevealのDOMからPPTXへの変換
   */
  public async convertFromRevealDOM(container: HTMLElement): Promise<void> {
    const slides: SlideContent[] = [];
    const slideElements = container.querySelectorAll('.slides section');

    slideElements.forEach((slideElement) => {
      const content: SlideContent = { type: 'content' };
      const contentItems: string[] = [];

      // 背景画像の判定
      const backgroundImage = slideElement.getAttribute(
        'data-background-image'
      );
      if (backgroundImage) {
        content.backgroundImage = backgroundImage;

        // 背景画像がある場合、テキストカラーを確認
        const textColorStyle = slideElement.getAttribute('style');
        if (textColorStyle?.includes('color: white')) {
          content.textColor = 'FFFFFF';
        }
      }

      // テキストコンテンツの収集
      slideElement
        .querySelectorAll('h1, h2, h3, li, p, pre code, table, img, svg')
        .forEach((element) => {
          if (element.tagName === 'H1') {
            content.type = 'title';
            content.title = element.textContent || '';
          } else if (element.tagName === 'H2' || element.tagName === 'H3') {
            content.type = 'content';
            content.title = element.textContent || '';
          } else if (element.tagName === 'LI' || element.tagName === 'P') {
            contentItems.push(element.textContent || '');
          } else if (element.tagName === 'CODE') {
            contentItems.push(`[Code]${element.textContent || ''}`);
          } else if (element.tagName === 'TABLE') {
            const headers: string[] = [];
            const rows: string[][] = [];

            // ヘッダーの処理
            element.querySelectorAll('th').forEach((th) => {
              headers.push(th.textContent || '');
            });

            // 行の処理
            element.querySelectorAll('tr').forEach((tr) => {
              const cells: string[] = [];
              tr.querySelectorAll('td').forEach((td) => {
                cells.push(td.textContent || '');
              });
              if (cells.length > 0) {
                rows.push(cells);
              }
            });

            content.table = { headers, rows };
          } else if (element.tagName === 'IMG') {
            const imgElement = element as HTMLImageElement;
            content.image = {
              src: imgElement.src || '',
              width: imgElement.naturalWidth / 96, // ピクセルからインチに変換
              height: imgElement.naturalHeight / 96,
            };
          } else if (element.tagName === 'svg') {
            const svgElement = element as SVGElement;
            // SVG要素のクローンを作成
            const clone = svgElement.cloneNode(true) as SVGElement;

            // 基本的な属性を設定（既存の属性は上書きしない）
            if (!clone.getAttribute('xmlns')) {
              clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            if (!clone.getAttribute('width')) {
              clone.setAttribute('width', svgElement.clientWidth.toString());
            }
            if (!clone.getAttribute('height')) {
              clone.setAttribute('height', svgElement.clientHeight.toString());
            }

            // SVGをシリアライズ
            const svgData = new XMLSerializer().serializeToString(clone);

            // Base64エンコード
            const base64SVG = btoa(unescape(encodeURIComponent(svgData)));
            const dataUrl = `data:image/svg+xml;base64,${base64SVG}`;

            content.image = {
              src: dataUrl,
              width: parseInt(clone.getAttribute('width') || '0') / 96,
              height: parseInt(clone.getAttribute('height') || '0') / 96,
              isSvg: true,
            };
          }
        });

      if (contentItems.length > 0) {
        content.content = contentItems;
      }

      slides.push(content);
    });

    this.pres.defineLayout({
      name: 'CUSTOM',
      width: 10,
      height: 5.625,
    });
    this.pres.layout = 'CUSTOM';

    for (const slide of slides) {
      if (slide.type === 'title') {
        await this.createTitleSlide(slide);
      } else {
        await this.createContentSlide(slide);
      }
    }

    await this.pres.writeFile({ fileName: 'presentation.pptx' });
  }
}
