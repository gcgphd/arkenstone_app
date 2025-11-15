import React, { useState } from "react";
import { Grid, Card } from "antd";
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Image, Upload, message, Button, Input } from 'antd';
import type { GetProp, UploadFile, UploadProps } from 'antd';
import { BACKEND_URL } from "../config";

const { useBreakpoint } = Grid;

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];



const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

interface GenerateCardProps {
  uId?: string;
  isMobile?: boolean;
  isLoading?: boolean;
  fileList: UploadFile[];
  onFileListChange: (list: UploadFile[]) => void;
  onGenerateClick?: (prompt: string) => void;
}

const GenerateCard: React.FC<GenerateCardProps> = ({
  uId,
  isMobile: forcedMobile,
  isLoading,
  fileList,
  onFileListChange,
  onGenerateClick
}) => {
  const screens = useBreakpoint();
  const isMobile = forcedMobile ?? !screens.sm;

  // ✅ Responsive width logic (no 100vw)
  const CARD_H = 120;          // avoid tall overflow on phones
  const CARD_PAD = isMobile ? 0 : 0;

  const ERROR_FALLBACK = "/assets/upload_error.png";

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [prompt, setPrompt] = React.useState("");
  //const [fileList, setFileList] = useState<UploadFile[]>([]);

  // ✅ Use the instance API and render its context holder
  const [messageApi, messageContextHolder] = message.useMessage();


  const parseResp = (resp: any) => {
    // resp might be string or object depending on transport
    try {
      return typeof resp === "string" ? JSON.parse(resp) : resp;
    } catch {
      return undefined;
    }
  };

  const handlePreview = async (file: UploadFile) => {

    if (file.status === "error") {
      // error: show error thumbnail (or fallback)
      const src = file.thumbUrl || ERROR_FALLBACK;
      setPreviewImage(src);
      setPreviewOpen(false);
      return;
    }

    // success/uploading: prefer server URL, else base64, else thumbUrl
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }
    const src = file.url || (file.preview as string) || file.thumbUrl || "";
    if (src) {
      setPreviewImage(src);
      setPreviewOpen(true);
    }
  };

  const handleChange: UploadProps["onChange"] = ({ file, fileList: newList }) => {

    // Success path: normalize server URL to both url/thumbUrl if provided
    if (file.status === "done") {
      const resp = parseResp(file.response);
      if (resp?.url) {
        const absolute = resp.url.startsWith("http") ? resp.url : `http://localhost:8080${resp.url}`;
        newList = newList.map((f) =>
          f.uid === file.uid ? { ...f, url: absolute, thumbUrl: absolute } : f
        );
      }
      console.log(newList)
      onFileListChange(newList);
      return;
    }

    if (file.status === "error") {
      const resp = parseResp(file.response);
      const messageText = "Upload failed — please try again."; //resp?.message || 
      const customThumb = resp?.errorThumbUrl || ERROR_FALLBACK;

      // Show toast via the instance
      messageApi.error(messageText);

      const updated: UploadFile<any>[] = newList.map((f): UploadFile<any> =>
        f.uid === file.uid
          ? {
            ...f,
            status: "error",
            url: undefined,
            thumbUrl: customThumb,
            percent: undefined,
            response: "Upload failed - please try again"
          }
          : f
      );

      onFileListChange(updated);             // ✅ still UploadFile[]
      return;
    }

    // Other statuses (uploading, removed, etc.)
    onFileListChange(newList);
  };


  const uploadButton = (
    <Button
      //type="primary"
      color="default"
      variant="text"
      size="small"
      icon={<PlusOutlined />}
      block
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        //backgroundColor: "var(--ant-color-primary)",
      }}
    >
    </Button>
  );

  return (
    <Card
      //hoverable
      style={{
        width: "100%",
        maxWidth: 720,
        //minWidth: 0,                  
        height: CARD_H,
        minHeight: 0,
        flex: isMobile ? "0 1 auto" : "0 0 200px",
        display: "flex",
        //flexDirection: "column",
        padding: CARD_PAD,
      }}
      styles={{
        body: {
          flex: 1,
          display: "flex",
          overflow: "hidden", // scroll if needed on phones
          padding: 10,
          minHeight: 0,

        },
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
        <Upload
          action={`${BACKEND_URL}/upload_image_to_gcs_signed_tmp`}
          data={{ uid: uId }}
          listType="picture-card"
          fileList={fileList}
          onPreview={handlePreview}
          onChange={handleChange}
          multiple
          style={{
            height: '100%'
          }}
        >
          {messageContextHolder}

          {fileList.length >= 8 ? null : uploadButton}
        </Upload>
        {
          previewImage && (
            <Image
              wrapperStyle={{ display: 'none' }}
              preview={{
                visible: previewOpen,
                onVisibleChange: (visible) => setPreviewOpen(visible),
                afterOpenChange: (visible) => !visible && setPreviewImage(''),
              }}
              src={previewImage}
            />
          )
        }


        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            //maxWidth: "100%",
            width: "100%",
            margin: "0 auto",
            padding: "6px 6px",
            background: "#161616ff",
            borderRadius: 16,
            border: "1px solid var(--ant-color-border)",
            boxShadow: "0 0 8px rgba(0,0,0,0.15)",
          }}
        >

          <Button
            icon={<SendOutlined />}
            loading={isLoading}
            disabled={isLoading}
            onClick={() => onGenerateClick?.(prompt)}
            block
            size="large"
            color="default"
            variant="text"
            style={{
              borderRadius: 14,
              fontSize: 12,
              maxWidth: "20%"
            }}
          >
            Generate
          </Button>

          <Input
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            style={{ width: "100%", flexGrow: 1 }}
            placeholder="Type your Prompt here"
            variant="borderless" />

        </div>


      </div>
    </Card >
  );
};

export default GenerateCard;

