import type { ApplicantCardStage } from '@/lib/types';
import { cn } from '@/lib/utils';

const img1 = '/images/application-stages/source.png';
const img2 = '/images/application-stages/maskAction.svg';
const imgRectangle34626556 = '/images/application-stages/patchAction.svg';
const img3 = '/images/application-stages/maskPending.svg';
const img4 = '/images/application-stages/maskConfirmed.svg';
const imgVector9196 = '/images/application-stages/patchConfirmed.svg';
const imgVector9197 = '/images/application-stages/rayLeft.svg';
const imgVector9198 = '/images/application-stages/rayRight.svg';
const imgVector9199 = '/images/application-stages/rayTop.svg';
const imgUnion = '/images/application-stages/bubble.svg';

/** Original Figma sprite crops and correction layers, retained at their designed size. */
export function FigmaApplicationStageIllustration({ stage, className }: { stage: ApplicantCardStage; className?: string }) {
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center', className)}>
    {stage === 'draft' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159051">
        <div className="absolute h-[68px] left-[-2px] top-[12px] w-[92px]" data-node-id="3695:159054" data-name="应用状态图标集 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[335.78%] left-0 max-w-none top-[-50.25%] w-[744.57%]" src={img1} />
          </div>
        </div>
      </div>)}
    {stage === 'submitted' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159056">
        <div className="absolute h-[228px] left-[-91px] top-[-22px] w-[685px]" data-node-id="3695:159057" data-name="应用状态图标集 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img1} />
        </div>
      </div>)}
    {stage === 'review' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159058">
        <div className="absolute h-[228px] left-[-180px] top-[-22px] w-[685px]" data-node-id="3695:159059" data-name="应用状态图标集 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img1} />
        </div>
      </div>)}
    {stage === 'interview-action' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159060">
        <div className="absolute h-[66px] left-[10px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[3px_5.5px] mask-size-[66px_58px] top-[14px] w-[72px]" data-node-id="3695:159061" style={{ maskImage: `url("${img2}")` }} data-name="应用状态图标集 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[345.96%] left-[-379.17%] max-w-none top-[-57.83%] w-[951.39%]" src={img1} />
          </div>
        </div>
        <div className="absolute h-[24.5px] left-[23px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-10px_-19.5px] mask-size-[66px_58px] top-[39px] w-[23.365px]" data-node-id="3695:159093" style={{ maskImage: `url("${img2}")` }}>
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRectangle34626556} />
        </div>
        <div className="absolute bg-accent left-[22px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-9px_-21.5px] mask-size-[66px_58px] rounded-[2px] size-[7px] top-[41px]" data-node-id="3695:159095" style={{ maskImage: `url("${img2}")` }} />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[22px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-9px_-31.5px] mask-size-[66px_58px] rounded-[2px] size-[7px] top-[51px]" data-node-id="3695:159097" style={{ maskImage: `url("${img2}")` }} />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[32px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-19px_-21.5px] mask-size-[66px_58px] rounded-[2px] size-[7px] top-[41px]" data-node-id="3695:159096" style={{ maskImage: `url("${img2}")` }} />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[32px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-19px_-31.5px] mask-size-[66px_58px] rounded-[2px] size-[7px] top-[51px]" data-node-id="3695:159098" style={{ maskImage: `url("${img2}")` }} />
      <img alt="" src={imgUnion} className="absolute left-[64px] top-[19px]" /></div>)}
    {stage === 'interview-pending' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159062">
        <div className="absolute bg-surface h-[9px] left-[30px] rounded-[4px] top-[20px] w-[4px]" data-node-id="3695:159113" />
        <div className="absolute bg-surface h-[9px] left-[50px] rounded-[4px] top-[20px] w-[4px]" data-node-id="3695:159114" />
        <div className="absolute contents left-[14.5px] top-[18px]" data-node-id="3695:159111" data-name="Mask group">
          <div className="absolute h-[64px] left-[13px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[1.5px_6px] mask-size-[69.5px_61.5px] top-[12px] w-[71px]" data-node-id="3695:159063" style={{ maskImage: `url("${img3}")` }} data-name="应用状态图标集 1">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img alt="" className="absolute h-[356.77%] left-[-500%] max-w-none top-[-197.14%] w-[964.79%]" src={img1} />
            </div>
          </div>
        </div>
        <div className="absolute bg-surface left-[25px] size-[24px] top-[38px]" data-node-id="3695:159112" />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[28px] rounded-[2px] size-[7px] top-[41px]" data-node-id="3695:159103" />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[28px] rounded-[2px] size-[7px] top-[51px]" data-node-id="3695:159104" />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[38px] rounded-[2px] size-[7px] top-[41px]" data-node-id="3695:159105" />
        <div className="absolute bg-surface border border-fg-muted border-solid left-[38px] rounded-[2px] size-[7px] top-[51px]" data-node-id="3695:159106" />
      </div>)}
    {stage === 'interview-confirmed' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159064">
        <div className="absolute h-[68px] left-[7px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[2px_5px] mask-size-[72.5px_59px] top-[11px] w-[74px]" data-node-id="3695:159065" style={{ maskImage: `url("${img4}")` }} data-name="应用状态图标集 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[335.78%] left-[-593.24%] max-w-none top-[-51.72%] w-[925.68%]" src={img1} />
          </div>
        </div>
        <div className="absolute h-[8.634px] left-[53.5px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-44.5px_-47px] mask-size-[72.5px_59px] top-[63px] w-[14.5px]" data-node-id="3706:159124" style={{ maskImage: `url("${img4}")` }}>
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector9196} />
        </div>
        <div className="absolute bg-surface h-[11px] left-[27px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-18px_-22px] mask-size-[72.5px_59px] top-[38px] w-[12px]" data-node-id="3706:159123" style={{ maskImage: `url("${img4}")` }} />
        <div className="absolute left-[30px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-21px_-24px] mask-size-[72.5px_59px] rounded-[1px] size-[7px] top-[40px]" data-node-id="3706:159121" style={{ maskImage: `url("${img4}")` }} data-name="应用状态图标集 2">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[1px]">
            <img alt="" className="absolute h-[2854.17%] left-[-5762.5%] max-w-none top-[-802.08%] w-[8562.5%]" src={img1} />
          </div>
        </div>
      </div>)}
    {stage === 'offer' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159066">
        <div className="absolute h-[57px] left-[12px] top-[21px] w-[66px]" data-node-id="3695:159067" data-name="应用状态图标集 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[400.58%] left-[-795.45%] max-w-none top-[-79.24%] w-[1037.88%]" src={img1} />
          </div>
        </div>
        <div className="absolute h-[4px] left-[37px] top-[16px] w-[3px]" data-node-id="3706:159125">
          <div className="absolute inset-[-25%_-33.34%]">
            <img alt="" className="block max-w-none size-full" src={imgVector9197} />
          </div>
        </div>
        <div className="absolute flex h-[4px] items-center justify-center left-[51px] top-[16px] w-[3px]" data-node-id="3706:159126">
          <div className="-scale-y-100 flex-none rotate-180">
            <div className="h-[4px] relative w-[3px]">
              <div className="absolute inset-[-25%_-33.34%]">
                <img alt="" className="block max-w-none size-full" src={imgVector9198} />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute h-[5px] left-[46px] top-[13px] w-0" data-node-id="3706:159128">
          <div className="absolute inset-[-20%_-1px]">
            <img alt="" className="block max-w-none size-full" src={imgVector9199} />
          </div>
        </div>
      </div>)}
    {stage === 'closed' && (<div className="relative size-[90px] shrink-0 overflow-clip" data-node-id="3695:159068">
        <div className="absolute h-[65px] left-[14px] top-[16px] w-[62px]" data-node-id="3695:159069" data-name="应用状态图标集 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[351.28%] left-[-975.81%] max-w-none top-[-61.79%] w-[1104.84%]" src={img1} />
          </div>
        </div>
      </div>)}
  </span>;
}
